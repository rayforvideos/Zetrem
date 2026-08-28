import type { ExitReason } from '@/entities/claude-cli/lib/exit-line/exit-line.types'

const MISSING = /\bENOENT\b|not found|no such file/i
const SIGNALLED = new Set([130, 143])

export function exitReason(
  code: number | null,
  stderr: string,
  spawnError: string,
): ExitReason | null {
  if (code === 0) return null
  if (spawnError.trim().length > 0) return startTrouble(spawnError)
  const said = lastLine(stderr)
  // A signal (null, or 128 + SIGINT/SIGTERM) is someone stopping it, not it dying.
  if (said.length === 0)
    return code === null || SIGNALLED.has(code) ? null : { code: 'died', said: String(code) }
  return MISSING.test(said) ? startTrouble(said) : { code: 'cli-said', said }
}

export function startTrouble(cause: string): ExitReason {
  if (MISSING.test(cause)) return { code: 'cli-missing', said: '' }
  return { code: 'start-failed', said: lastLine(cause) }
}

function lastLine(text: string): string {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  return lines.at(-1) ?? ''
}
