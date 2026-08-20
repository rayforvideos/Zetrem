import { spawn } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { managerOf } from '@/entities/agent-session/model/cli-update/cli-update'
import { agentEnv } from '@/shared/lib/shell-env/shell-env'
import { claudeBin, findCommand, loginPath } from './login-path/login-path'
import { handle } from './ipc/ipc'
import { killTree } from './kill-tree/kill-tree'
import { launchFor } from './spawn-claude/spawn-claude'

const REGISTRY = 'https://registry.npmjs.org/@anthropic-ai/claude-code/latest'

const FETCH_TIMEOUT_MS = 5000

const UPDATE_TIMEOUT_MS = 180_000

const VERSION = /\d+(?:\.\d+)+/

const PROBE_TIMEOUT_MS = 5000

function probe(command: string, args: string[], path: string): Promise<string | null> {
  return new Promise((resolve) => {
    const launch = launchFor(command, args)
    const child = spawn(launch.command, launch.args, {
      env: agentEnv(process.env, path),
      windowsHide: true,
    })
    child.stdout.setEncoding('utf8')
    let out = ''
    let settled = false
    const settle = (value: string | null): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(value)
    }
    const timer = setTimeout(() => {
      // SIGTERM on Windows only reaches the cmd.exe wrapper, leaving the
      // real process running; kill the whole tree instead.
      if (child.pid !== undefined) killTree(child.pid)
      else child.kill()
      settle(null)
    }, PROBE_TIMEOUT_MS)
    child.stdout.on('data', (chunk: string) => {
      out += chunk
    })
    child.on('error', () => settle(null))
    child.on('exit', () => settle(out))
  })
}

async function latestVersion(): Promise<string | null> {
  try {
    const response = await fetch(REGISTRY, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!response.ok) return null
    const body = (await response.json()) as { version?: unknown }
    return typeof body.version === 'string' ? body.version : null
  } catch {
    return null
  }
}

async function manager(): Promise<string | null> {
  const found = findCommand('claude', await loginPath()) ?? ''
  if (found.length === 0) return null
  try {
    return managerOf(realpathSync(found))
  } catch {
    return managerOf(found)
  }
}

async function installedVersion(): Promise<string | null> {
  const out = await probe(await claudeBin(), ['--version'], await loginPath())
  return out === null ? null : (VERSION.exec(out)?.[0] ?? null)
}

export function registerCliVersion(): void {
  handle('cli:latest', async () => {
    const [installed, latest, managedBy] = await Promise.all([
      installedVersion(),
      latestVersion(),
      manager(),
    ])
    return { installed, latest, managedBy }
  })

  handle('cli:update', async () => {
    const path = await loginPath()
    const bin = await claudeBin()
    return new Promise<{ output: string }>((resolve) => {
      const run = launchFor(bin, ['update'])
      const child = spawn(run.command, run.args, {
        env: agentEnv(process.env, path),
        windowsHide: true,
      })
      child.stdout.setEncoding('utf8')
      child.stderr.setEncoding('utf8')
      let output = ''
      const take = (chunk: string): void => {
        output += chunk
      }
      let settled = false
      const settle = (text: string): void => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve({ output: text })
      }
      const timer = setTimeout(() => {
        // SIGTERM on Windows only reaches the cmd.exe wrapper, leaving the
        // real process running; kill the whole tree instead.
        if (child.pid !== undefined) killTree(child.pid)
        else child.kill()
        settle(
          `${output.trim().slice(-2000)}\nUpdate did not finish within 3 minutes and was stopped — try running claude update in your terminal`.trim(),
        )
      }, UPDATE_TIMEOUT_MS)
      child.stdout.on('data', take)
      child.stderr.on('data', take)
      child.on('error', () => settle('claude command not found'))
      child.on('exit', () => settle(output.trim().slice(-2000)))
    })
  })
}
