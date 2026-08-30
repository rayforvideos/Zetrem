import type { UsageAfter } from './usage-due.types'

export const USAGE_FRESH_MS = 300_000

export const USAGE_FLOOR_MS = 30_000

export function dueForUsage(readAtMs: number | null, nowMs: number, after: UsageAfter): boolean {
  // A reading taken for another account is not fresh, it is wrong, so no
  // throttle stands in the way of replacing it.
  if (after === 'account') return true
  if (readAtMs === null) return true
  const age = nowMs - readAtMs
  if (age < 0) return false
  return age >= (after === 'turn' ? USAGE_FLOOR_MS : USAGE_FRESH_MS)
}
