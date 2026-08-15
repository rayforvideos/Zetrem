import type { Call } from '@/entities/agent-session'

const QUICK_MS = 100
const SLOW_MS = 60_000
const MIN_FILL = 4
const MAX_FILL = 100

export function fillOf(call: Call): number {
  if (call.endedAtMs === null) return MIN_FILL
  const took = call.endedAtMs - call.startedAtMs
  if (!Number.isFinite(took) || took <= 0) return MIN_FILL
  const reach = Math.log1p(took / QUICK_MS) / Math.log1p(SLOW_MS / QUICK_MS)
  const span = MIN_FILL + (MAX_FILL - MIN_FILL) * reach
  return Math.round(Math.min(MAX_FILL, Math.max(MIN_FILL, span)))
}
