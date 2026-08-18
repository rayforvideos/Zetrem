import type { ExitReason } from './exit-reason.types'

const MISSING = /\bENOENT\b|not found|no such file/i

export function exitReason(code: number | null, stderr: string, spawnError: string): ExitReason | null {
  if (code === 0) return null
  if (spawnError.trim().length > 0) return startTrouble(spawnError)
  const said = lastLine(stderr)
  if (said.length === 0) return null
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
