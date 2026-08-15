const QUICK_MS = 100
const SLOW_MS = 60_000
const MIN_REACH = 4
const MAX_REACH = 100

export function reachOf(ms: number): number {
  if (!Number.isFinite(ms) || ms <= 0) return MIN_REACH
  const part = Math.log1p(ms / QUICK_MS) / Math.log1p(SLOW_MS / QUICK_MS)
  const span = MIN_REACH + (MAX_REACH - MIN_REACH) * part
  return Math.round(Math.min(MAX_REACH, Math.max(MIN_REACH, span)))
}
