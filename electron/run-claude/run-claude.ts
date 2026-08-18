import { spawn } from 'node:child_process'
import type { PluginRun } from '@/entities/plugin/lib/catalog/catalog.types'
import { agentEnv } from '@/shared/lib/shell-env/shell-env'
import { claudeBin, loginPath } from '../login-path/login-path'
import { launchFor } from '../spawn-claude/spawn-claude'

export function runClaude(args: string[], timeoutMs: number, cwd?: string): Promise<PluginRun> {
  return new Promise((resolve) => {
    void (async () => {
      const launch = launchFor(await claudeBin(), args)
      const child = spawn(launch.command, launch.args, {
        env: agentEnv(process.env, await loginPath()),
        ...(cwd === undefined ? {} : { cwd }),
      })
      child.stdout.setEncoding('utf8')
      child.stderr.setEncoding('utf8')
      let out = ''
      let settled = false
      const settle = (value: PluginRun): void => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(value)
      }
      const timer = setTimeout(() => {
        child.kill('SIGTERM')
        settle({ ok: false, out: `${out}\ntimed out` })
      }, timeoutMs)
      child.stdout.on('data', (chunk: string) => {
        out += chunk
      })
      child.stderr.on('data', (chunk: string) => {
        out += chunk
      })
      child.on('error', (cause: Error) => settle({ ok: false, out: cause.message }))
      child.on('exit', (code) => settle({ ok: code === 0, out }))
    })()
  })
}
