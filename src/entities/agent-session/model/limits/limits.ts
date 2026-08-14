import type { RateLimit } from '../../api/claude/status/status.types'

const ORDER = ['five_hour', 'seven_day', 'seven_day_opus', 'seven_day_sonnet']

function rank(kind: string): number {
  const at = ORDER.indexOf(kind)
  return at === -1 ? ORDER.length : at
}

export function withLimit(held: RateLimit[], next: RateLimit): RateLimit[] {
  const rest = held.filter((limit) => limit.kind !== next.kind)
  return [...rest, next].sort((a, b) => rank(a.kind) - rank(b.kind))
}

export function pressing(limits: RateLimit[]): RateLimit | null {
  const warned = limits.filter((limit) => limit.status !== 'allowed' || limit.overage)
  const pool = warned.length > 0 ? warned : limits
  return pool.reduce<RateLimit | null>(
    (worst, limit) => (worst === null || limit.utilization > worst.utilization ? limit : worst),
    null,
  )
}
