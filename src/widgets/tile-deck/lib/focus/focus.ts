import type { AgentSession } from '@/entities/agent-session'

const RANK: Record<AgentSession['status'], number> = {
  waiting: 0,
  working: 1,
  reported: 2,
  done: 3,
}

function since(session: AgentSession): number {
  return session.waitingSinceMs ?? session.startedAtMs
}

export function focusOf(sessions: AgentSession[], held: string | null): string | null {
  if (sessions.length === 0) return null
  if (held !== null && sessions.some((one) => one.id === held)) return held
  const sorted = [...sessions].sort(
    (a, b) => RANK[a.status] - RANK[b.status] || since(a) - since(b),
  )
  return sorted[0]?.id ?? null
}
