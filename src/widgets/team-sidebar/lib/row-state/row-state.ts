import type { RosterState } from '@/entities/teammate'
import type { TeamMember } from '../team/team.types'
import type { RowState } from './row-state.types'
import { t } from '@lingui/core/macro'

// Read at call time, never at import: the locale is not up yet when this module loads.
function said(state: RosterState): string | null {
  if (state === 'waiting') return t`Waiting on you`
  if (state === 'done') return t`Reported back`
  return null
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
    now: settled ? null : (said(member.state) ?? member.note),
    lit: state !== 'idle' || unread,
    open: settled ? null : member.sessionId,
  }
}
