import { exitLine } from '@/entities/claude-cli'
import type { AgentEventRefs } from '../agent-events/agent-events.types'
import { forgetCrew } from '../agent-events/crew/crew'
import type { SessionClose } from './session-bookkeeping.types'

export function closeSession(refs: AgentEventRefs, { reason, stopped }: SessionClose): void {
  const { conversation, status, children } = refs.stores
  conversation.settleDraft()
  if (reason !== null) conversation.system(exitLine(reason))
  conversation.setStatus('done')
  conversation.setPermission(null)
  // A user-initiated stop also exits with a reason, but that is not trouble.
  conversation.setTrouble(!stopped && reason !== null)
  refs.asks.length = 0
  status.apply({ type: 'activity', activity: 'idle' })
  conversation.clearChores()
  for (const childId of refs.childIds) children.patch(childId, { status: 'done' })
  refs.childIds.clear()
  forgetCrew(refs)
}

export function beginSession(refs: AgentEventRefs, resumed: boolean): void {
  const { conversation, status, children } = refs.stores
  status.reset(resumed)
  children.clear()
  forgetCrew(refs)
  refs.childIds.clear()
  refs.sends.clear()
  refs.limits.clear()
  refs.asks.length = 0
  conversation.setStatus('working')
  conversation.setTrouble(false)
  // A background command dies with the CLI that ran it. When the last exit
  // skipped closeSession (the relaunch path does), its banner is still here,
  // timing a process that no longer exists.
  conversation.clearChores()
}
