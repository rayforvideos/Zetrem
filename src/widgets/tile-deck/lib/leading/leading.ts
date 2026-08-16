import type { AgentSession } from '@/entities/agent-session'

function some(sessions: AgentSession[], status: AgentSession['status']): boolean {
  return sessions.some((session) => session.status === status)
}

export function leading(sessions: AgentSession[]): string {
  if (sessions.length === 0) return 'On your own'
  if (some(sessions, 'working')) return 'Orchestrating'
  if (some(sessions, 'waiting')) return 'Held up'
  if (some(sessions, 'reported')) return 'Reading reports'
  return 'Wrapped up'
}
