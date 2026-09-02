// Named so the rule has one place to live: the "done" nudge fires once
// "someone is working" has stayed false for a stretch, not on the raw
// true -> false edge. In real runs the orchestrator can go idle for a
// couple hundred ms between a teammate finishing and it waking to relay
// the result, so a bare edge fires twice for one job. See stirring() in
// ../live/live.ts for what counts as "busy".
export const SETTLE_GRACE_MS = 1500

export function settledAfter(idleSinceMs: number | null, nowMs: number): boolean {
  if (idleSinceMs === null) return false
  return nowMs - idleSinceMs >= SETTLE_GRACE_MS
}
