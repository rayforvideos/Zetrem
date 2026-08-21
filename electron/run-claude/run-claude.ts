import type { PluginRun } from '@/entities/plugin/lib/catalog/catalog.types'
import { agentEnv } from '@/shared/lib/shell-env/shell-env'
import { claudeBin, loginPath } from '../login-path/login-path'
import { runSettled, trackChild, untrackChild } from '../run-settled/run-settled'

export async function runClaude(args: string[], timeoutMs: number, cwd?: string): Promise<PluginRun> {
  return runSettled<PluginRun>({
    bin: await claudeBin(),
    args,
    env: agentEnv(process.env, await loginPath()),
    ...(cwd === undefined ? {} : { cwd }),
    mergeStderr: true,
    spawned: trackChild,
    settled: untrackChild,
    timeout: { ms: timeoutMs, then: (text) => ({ ok: false, out: `${text}\ntimed out` }) },
    exit: (code, text) => ({ ok: code === 0, out: text }),
    error: (cause) => ({ ok: false, out: cause.message }),
  })
}
