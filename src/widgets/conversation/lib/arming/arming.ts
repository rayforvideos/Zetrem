const GRACE_MS = 300

// A decision aimed at the ask this one just replaced must not land on it.
export function armed(shownAtMs: number, nowMs: number): boolean {
  return nowMs - shownAtMs >= GRACE_MS
}
