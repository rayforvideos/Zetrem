import { spawn } from 'node:child_process'
import { readCatalog, readMarketplaces, safeTarget } from '@/entities/plugin'
import type { Catalog, Marketplace, PluginRun } from '@/entities/plugin'
import { agentEnv } from '@/shared/lib/shell-env/shell-env'
import { claudeBin, loginPath } from './login-path/login-path'
import { handle } from './ipc/ipc'

const READ_TIMEOUT_MS = 20_000

const ACT_TIMEOUT_MS = 180_000

type Run = PluginRun

function run(args: string[], timeoutMs: number): Promise<Run> {
  return new Promise((resolve) => {
    void (async () => {
      const child = spawn(await claudeBin(), args, {
        env: agentEnv(process.env, await loginPath()),
      })
      let out = ''
      let settled = false
      const settle = (value: Run): void => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(value)
      }
      const timer = setTimeout(() => {
        child.kill('SIGTERM')
        settle({ ok: false, out: `${out}\ntimed out` })
      }, timeoutMs)
      child.stdout.on('data', (chunk: Buffer) => {
        out += chunk.toString('utf8')
      })
      child.stderr.on('data', (chunk: Buffer) => {
        out += chunk.toString('utf8')
      })
      child.on('error', (cause: Error) => settle({ ok: false, out: cause.message }))
      child.on('exit', (code) => settle({ ok: code === 0, out }))
    })()
  })
}

function firstJson(out: string): unknown {
  const at = out.search(/[[{]/)
  if (at === -1) return null
  try {
    return JSON.parse(out.slice(at))
  } catch {
    return null
  }
}

export function registerPlugins(): void {
  handle('plugins:catalog', async (): Promise<Catalog> => {
    const result = await run(['plugin', 'list', '--json', '--available'], READ_TIMEOUT_MS)
    return readCatalog(firstJson(result.out))
  })

  handle('plugins:marketplaces', async (): Promise<Marketplace[]> => {
    const result = await run(['plugin', 'marketplace', 'list', '--json'], READ_TIMEOUT_MS)
    return readMarketplaces(firstJson(result.out))
  })

  handle('plugins:act', async (_event, verb: unknown, target: unknown): Promise<Run> => {
    const name = safeTarget(target)
    if (name === null) return { ok: false, out: 'that name cannot be used' }
    switch (verb) {
      case 'install':
      case 'uninstall':
      case 'enable':
      case 'disable':
      case 'update':
        return run(['plugin', verb, name], ACT_TIMEOUT_MS)
      case 'market-add':
        return run(['plugin', 'marketplace', 'add', name], ACT_TIMEOUT_MS)
      case 'market-remove':
        return run(['plugin', 'marketplace', 'remove', name], ACT_TIMEOUT_MS)
      case 'market-update':
        return run(['plugin', 'marketplace', 'update', name], ACT_TIMEOUT_MS)
      default:
        return { ok: false, out: 'unknown action' }
    }
  })
}
