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

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === 'string' && CHARACTERS.includes(value as CharacterId)
}

function hash(text: string): number {
  let value = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 0x01000193)
  }
  return value >>> 0
}

export function characterOf(subagentType: string, chosen?: string | null): CharacterId {
  if (isCharacterId(chosen)) return chosen
  return CHARACTERS[hash(subagentType) % CHARACTERS.length] as CharacterId
}

export function moodOf(state: MemberState): Mood {
  switch (state) {
    case 'working':
      return 'busy'
    case 'waiting':
      return 'default'
    case 'done':
      return 'relax'
    case 'idle':
      return 'sleepy'
    default:
      return 'default'
  }
}
