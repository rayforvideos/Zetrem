import type { Call } from '@/entities/agent-session'

// A dev server, a watcher, `expo run:*`: a command that was never going to
// exit. Under this the clock on the call is enough; over it the tile says so
// in words, because the person is looking at a teammate that is not stuck so
// much as waiting on something that will not end.
export const LONG_CALL_MS = 3 * 60_000

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS

export function longRunning(call: Call, nowMs: number): boolean {
  return call.endedAtMs === null && nowMs - call.startedAtMs >= LONG_CALL_MS
}

// Whole minutes, so the chip settles once a minute rather than ticking: past
// three minutes the seconds are noise, and a number that will not sit still is
// harder to read than one that does.
export function runningFor(elapsedMs: number): string {
  const held = Math.max(0, elapsedMs)
  if (held < HOUR_MS) return `${Math.floor(held / MINUTE_MS)}m`
  const hours = Math.floor(held / HOUR_MS)
  const minutes = Math.floor((held % HOUR_MS) / MINUTE_MS)
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`
}
