import type { AgentSession } from '@/entities/agent-session'
import { t } from '@lingui/core/macro'

function some(sessions: AgentSession[], status: AgentSession['status']): boolean {
  return sessions.some((session) => session.status === status)
}

export function leading(sessions: AgentSession[]): string {
  if (sessions.length === 0) return t`On your own`
  if (some(sessions, 'working')) return t`Orchestrating`
  if (some(sessions, 'waiting')) return t`Held up`
  if (some(sessions, 'reported')) return t`Reading reports`
  return t`Wrapped up`
}
