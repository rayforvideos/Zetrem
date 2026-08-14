import type { AgentSession } from '@/entities/agent-session'

export function attentionId(sessions: AgentSession[]): string | null {
  let chosen: AgentSession | undefined
  for (const session of sessions) {
    if (session.status !== 'waiting') continue
    if (chosen === undefined || waitingSince(session) < waitingSince(chosen)) chosen = session
  }
  return chosen?.id ?? null
}

function waitingSince(session: AgentSession): number {
  return session.waitingSinceMs ?? Number.POSITIVE_INFINITY
}
