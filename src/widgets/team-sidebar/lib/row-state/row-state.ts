import type { RosterState } from '@/entities/agent-session'
import type { TeamMember } from '../team/team.types'
import type { RowState } from './row-state.types'

const SAID: Record<RosterState, string | null> = {
  waiting: 'Waiting on you',
  working: null,
  done: 'Reported back',
  idle: null,
}

function over(state: RosterState): boolean {
  return state === 'done' || state === 'idle'
}

export function rowStateOf(member: TeamMember, read: string[]): RowState {
  const seen = member.sessionId !== null && read.includes(member.sessionId)
  const settled = seen && over(member.state)
  const state = settled ? 'idle' : member.state
  const unread = member.sessionId !== null && !seen

  return {
    state,
    now: settled ? null : (SAID[member.state] ?? member.note),
    lit: state !== 'idle' || unread,
    open: settled ? null : member.sessionId,
  }
}
