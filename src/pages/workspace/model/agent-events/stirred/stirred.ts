import type { ClaudeTurnEvent } from '@/entities/agent-session'
import type { SessionStatus } from '@/entities/agent-session'

const FROM_THE_MODEL: ClaudeTurnEvent['type'][] = [
  'session',
  'headline',
  'delta',
  'thinking',
  'stream',
]

export function stirred(
  turn: ClaudeTurnEvent,
  at: { status: SessionStatus; asked: boolean },
): boolean {
  if (at.status === 'working' || at.asked) return false
  return FROM_THE_MODEL.includes(turn.type)
}
