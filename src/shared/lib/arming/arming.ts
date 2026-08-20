const GRACE_MS = 300

// A decision aimed at the previous ask should not land on the one that
// just replaced it, so decisions are ignored for a brief window after it appears.
export function armed(shownAtMs: number, nowMs: number): boolean {
  return nowMs - shownAtMs >= GRACE_MS
}
