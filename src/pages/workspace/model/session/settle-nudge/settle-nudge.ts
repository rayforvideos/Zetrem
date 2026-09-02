// Named so the rule has one place to live: the "done" nudge fires on the
// true -> false edge of "someone is working", not on every edge of the
// orchestrator's own status. See stirring() in ../live/live.ts for what
// counts as "busy".
export function settledNow(wasBusy: boolean, busy: boolean): boolean {
  return wasBusy && !busy
}
