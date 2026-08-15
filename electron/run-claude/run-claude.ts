import { spawn } from 'node:child_process'
import type { PluginRun } from '@/entities/plugin'
import { agentEnv } from '@/shared/lib/shell-env/shell-env'
import { claudeBin, loginPath } from '../login-path/login-path'

export function runClaude(args: string[], timeoutMs: number): Promise<PluginRun> {
  return new Promise((resolve) => {
    void (async () => {
      const child = spawn(await claudeBin(), args, {
        env: agentEnv(process.env, await loginPath()),
      })
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
