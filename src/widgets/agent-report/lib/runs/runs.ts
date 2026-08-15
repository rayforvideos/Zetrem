import type { AgentSession } from '@/entities/agent-session'

function kindOf(session: AgentSession): string {
  return session.subagentType.length > 0 ? session.subagentType : session.label
}

export function runsOf(sessions: AgentSession[], session: AgentSession): AgentSession[] {
  const kind = kindOf(session)
  return sessions
    .filter((held) => kindOf(held) === kind)
    .sort((a, b) => a.startedAtMs - b.startedAtMs)
}

export function stepTo(runs: AgentSession[], at: number, by: number): string | null {
  const next = runs[at + by]
  return next === undefined ? null : next.id
}
