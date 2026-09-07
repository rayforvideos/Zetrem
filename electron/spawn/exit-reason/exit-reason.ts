import type { ExitReason } from '@/entities/claude-cli/lib/exit-line/exit-line.types'
import type { Ending } from './exit-reason.types'

const MISSING = /\bENOENT\b|not found|no such file/i
// 128 + the signal number: how a shell reports a child something else ended.
const SIGNALLED = new Map<number, string>([
  [130, 'SIGINT'],
  [137, 'SIGKILL'],
  [143, 'SIGTERM'],
])

// How the process ended, in one word the app log and the pane both use: the
// code where it chose its own end, the signal's name where something else did.
export function endedWith(code: number | null, signal: string | null): string {
  if (signal !== null && signal.length > 0) return signal
  if (code !== null) return SIGNALLED.get(code) ?? `exit ${code}`
  // close() hands over a code or a signal, never neither. One that somehow
  // reports neither still gets a word rather than leaving a hole in a sentence.
  return 'exit unknown'
}

export function exitReason(end: Ending): ExitReason | null {
  if (end.spawnError.trim().length > 0) return startTrouble(end.spawnError)
  if (end.code === 0) return null
  // A signal used to be read as someone stopping it, and stayed silent for
  // that reason. Who asked is now known outright, so an end nobody asked for
  // is told even when a signal is all it left behind.
  if (end.asked) return null
  const ended = endedWith(end.code, end.signal)
  const said = lastLine(end.stderr)
  if (said.length === 0) {
    return ended.startsWith('exit ')
      ? { code: 'died', said: String(end.code), ended }
      : { code: 'signalled', said: ended, ended }
  }
  return MISSING.test(said) ? startTrouble(said) : { code: 'cli-said', said, ended }
}

export function startTrouble(cause: string): ExitReason {
  if (MISSING.test(cause)) return { code: 'cli-missing', said: '', ended: '' }
  return { code: 'start-failed', said: lastLine(cause), ended: '' }
}

function lastLine(text: string): string {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  return lines.at(-1) ?? ''
}
