import { exitLine, sessionStore, statusStore } from '@/entities/agent-session'
import { conversation } from '../conversation/conversation'
import type { SessionBegin, SessionClose } from './session-bookkeeping.types'

// The order here is the order the screen sees: a drafted turn settles before the
// exit line lands after it.
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
}

export function beginSession({ resumed, asks, sends, childIds }: SessionBegin): void {
  statusStore.reset(resumed)
  sessionStore.clear()
  childIds.clear()
  sends.clear()
  asks.length = 0
  conversation.setStatus('working')
  conversation.setTrouble(false)
}
