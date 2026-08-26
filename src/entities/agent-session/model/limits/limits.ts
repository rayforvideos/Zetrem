import type { RateLimit } from '@/entities/claude-cli/@x/agent-session'

const ORDER = ['five_hour', 'seven_day', 'seven_day_opus', 'seven_day_sonnet']

function rank(kind: string): number {
  const at = ORDER.indexOf(kind)
  return at === -1 ? ORDER.length : at
}

export function withLimit(held: RateLimit[], next: RateLimit): RateLimit[] {
  const before = held.find((limit) => limit.kind === next.kind)
  const rest = held.filter((limit) => limit.kind !== next.kind)
  const kept =
    next.utilization === null ? { ...next, utilization: before?.utilization ?? null } : next
  return [...rest, kept].sort((a, b) => rank(a.kind) - rank(b.kind))
}
