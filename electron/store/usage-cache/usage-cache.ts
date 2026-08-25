import type { Kept } from './usage-cache.types'

export const USAGE_KEEP_MS = 6 * 60 * 60 * 1000

export function stillWorthShowing(kept: Kept | null, nowMs: number): boolean {
  if (kept === null) return false
  if (kept.report.trim().length === 0) return false
  const age = nowMs - kept.atMs
  return age >= 0 && age < USAGE_KEEP_MS
}

export function readKept(text: string): Kept | null {
  try {
    const held = JSON.parse(text) as { report?: unknown; atMs?: unknown }
    if (typeof held.report !== 'string' || typeof held.atMs !== 'number') return null
    return { report: held.report, atMs: held.atMs }
  } catch {
    return null
  }
}
