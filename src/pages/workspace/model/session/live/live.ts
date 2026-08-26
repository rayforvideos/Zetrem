import type { SessionStatus, StatusState } from '@/entities/agent-session'

export function sessionLive(status: StatusState, conversation: SessionStatus): boolean {
  return status.session !== null && conversation !== 'done'
}

export function stirring(
  conversation: SessionStatus,
  children: { status: SessionStatus }[],
): boolean {
  if (conversation === 'working') return true
  return children.some((child) => child.status === 'working')
}
