import type { ClaudeTurnEvent } from '@/entities/agent-session'

export const STOPPED_BY_YOU = 'You stopped this'

export function afterYouStopped(turn: ClaudeTurnEvent, stopping: boolean): ClaudeTurnEvent {
  if (!stopping) return turn
  if (turn.type !== 'notice') return turn
  if (!turn.text.startsWith('Stopped')) return turn
  return { ...turn, text: STOPPED_BY_YOU }
}
