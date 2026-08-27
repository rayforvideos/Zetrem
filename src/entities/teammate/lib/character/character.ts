import { fnv1a } from '@/shared/lib/fnv/fnv'
import type { CharacterId, MemberState, Mood } from './character.types'

export const CHARACTERS: readonly CharacterId[] = [
  'jelly',
  'heart',
  'planet',
  'star',
  'double',
  'flower',
  'ghost',
  'bunny',
  'rock',
  'cloud',
]

export const DEFAULT_CHARACTER: CharacterId = 'jelly'

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === 'string' && CHARACTERS.includes(value as CharacterId)
}

export function characterOf(subagentType: string, chosen?: string | null): CharacterId {
  if (isCharacterId(chosen)) return chosen
  return CHARACTERS[fnv1a(subagentType) % CHARACTERS.length] as CharacterId
}

export function moodOf(state: MemberState): Mood {
  switch (state) {
    case 'working':
      return 'busy'
    case 'waiting':
      return 'default'
    case 'reported':
    case 'done':
      return 'relax'
    case 'idle':
      return 'sleepy'
    default:
      return 'default'
  }
}
