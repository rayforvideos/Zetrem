import type { CrewLog, CrewLogEntry, CrewLogNote } from './crew-log.types'

// A stuck tile has to be explained from what happened, and what happened is a
// few hundred decisions, not a transcript. The ring is small enough to carry
// for free and long enough to hold the run that went wrong.
export const CREW_LOG_MAX = 500

export function createCrewLog(max: number = CREW_LOG_MAX): CrewLog {
  const size = Math.max(1, Math.floor(max))
  const ring: CrewLogEntry[] = []
  // Where the next entry goes once the ring is full: the oldest slot.
  let next = 0

  return {
    note(one: CrewLogNote): void {
      const entry: CrewLogEntry = {
        atMs: Date.now(),
        event: one.event,
        toolUseId: one.toolUseId ?? null,
        taskId: one.taskId ?? null,
        seat: one.seat ?? null,
        decision: one.decision,
      }
      if (ring.length < size) {
        ring.push(entry)
        next = ring.length % size
        return
      }
      ring[next] = entry
      next = (next + 1) % size
    },
    entries(): CrewLogEntry[] {
      if (ring.length < size) return [...ring]
      return [...ring.slice(next), ...ring.slice(0, next)]
    },
    clear(): void {
      ring.length = 0
      next = 0
    },
  }
}
