import type { Call } from '@/entities/agent-session'
import { reachOf } from '@/shared/lib/reach/reach'

export function fillOf(call: Call): number {
  if (call.endedAtMs === null) return reachOf(0)
  return reachOf(call.endedAtMs - call.startedAtMs)
}
