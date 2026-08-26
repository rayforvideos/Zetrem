import { lost, won } from '@/shared/lib/outcome/outcome'
import type { Outcome } from '@/shared/lib/outcome/outcome.types'
import { agentEnv } from '../shell-env/shell-env'
import { claudeBin, loginPath } from '../../cli/login-path/login-path'
import { runSettled, trackChild, untrackChild } from '../run-settled/run-settled'

export async function runClaude(
  args: string[],
  timeoutMs: number,
  cwd?: string,
): Promise<Outcome<string>> {
  return runSettled<Outcome<string>>({
    bin: await claudeBin(),
    args,
    env: agentEnv(process.env, await loginPath()),
    ...(cwd === undefined ? {} : { cwd }),
    mergeStderr: true,
    spawned: trackChild,
    settled: untrackChild,
    timeout: { ms: timeoutMs, answers: (text) => lost('timeout', text) },
    exit: (code, text) => (code === 0 ? won(text) : lost('cli', text)),
    error: (cause) => lost('failed', cause.message),
  })
}
