export const USAGE_FRESH_MS = 300_000

export const USAGE_FLOOR_MS = 30_000

export function dueForUsage(readAtMs: number | null, nowMs: number, after: 'turn' | 'tick'): boolean {
  if (readAtMs === null) return true
  const age = nowMs - readAtMs
  if (age < 0) return false
  return age >= (after === 'turn' ? USAGE_FLOOR_MS : USAGE_FRESH_MS)
}
