import { sessionStore, statusStore } from '@/entities/agent-session'
import { exitLine } from '@/entities/claude-cli'
import { conversation } from '../../chat/conversation/conversation'
import { forgetCrew } from '../agent-events/crew/crew'
import type { SessionBegin, SessionClose } from './session-bookkeeping.types'

export function closeSession({ reason, stopped, asks, childIds }: SessionClose): void {
  conversation.settleDraft()
  if (reason !== null) conversation.system(exitLine(reason))
  conversation.setStatus('done')
  conversation.setPermission(null)
  // A user-initiated stop also exits with a reason, but that is not trouble.
  conversation.setTrouble(!stopped && reason !== null)
  asks.length = 0
  statusStore.apply({ type: 'activity', activity: 'idle' })
  conversation.clearChores()
  for (const childId of childIds) sessionStore.patch(childId, { status: 'done' })
  childIds.clear()
  forgetCrew()
}

export function beginSession({ resumed, asks, sends, childIds }: SessionBegin): void {
  statusStore.reset(resumed)
  sessionStore.clear()
  forgetCrew()
  childIds.clear()
  sends.clear()
  asks.length = 0
  conversation.setStatus('working')
  conversation.setTrouble(false)
  // A background command dies with the CLI that ran it. When the last exit
  // skipped closeSession (the relaunch path does), its banner is still here,
  // timing a process that no longer exists.
  conversation.clearChores()
}
