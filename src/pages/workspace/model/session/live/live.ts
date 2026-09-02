import type { SessionStatus, StatusState } from '@/entities/agent-session'
import type { Working } from '../chat-sessions/chat-sessions.types'

export function sessionLive(status: StatusState, conversation: SessionStatus): boolean {
  return status.session !== null && conversation !== 'done'
}

// What an account change has to weigh. It stops every chat, so a reply running
// behind an idle screen is exactly the one that would go without a word.
export function anySessionLive(onScreen: boolean, working: Working): boolean {
  return onScreen || Object.keys(working).length > 0
}

export function stirring(
  conversation: SessionStatus,
  children: { status: SessionStatus }[],
): boolean {
  if (conversation === 'working') return true
  return children.some((child) => child.status === 'working')
}
