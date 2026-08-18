import type { ClaudeTurnEvent } from '@/entities/agent-session'
import { t } from '@lingui/core/macro'

// Read at call time, never at import: the locale is not up yet when this module loads.
export function stoppedByYou(): string {
  return t`You stopped this`
}

export function afterYouStopped(turn: ClaudeTurnEvent, stopping: boolean): ClaudeTurnEvent {
  if (!stopping) return turn
  if (turn.type !== 'notice') return turn
  if (!turn.text.startsWith('Stopped')) return turn
  return { ...turn, text: stoppedByYou() }
}
