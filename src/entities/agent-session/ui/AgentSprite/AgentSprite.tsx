import { cn } from '@/shared/lib/cn'
import { useFace } from '../../model/crew/crew'
import { characterOf, moodOf } from '../../model/character/character'
import type { CharacterId, MemberState, Mood } from '../../model/character/character.types'
import { SPRITES } from './sprites'

const DETAIL_FROM = 40

function phaseOf(seed: string): number {
  let value = 0
  for (let index = 0; index < seed.length; index += 1) {
    value = (value * 31 + seed.charCodeAt(index)) % 2000
  }
  return value
}

export function AgentSprite({
  subagentType,
  chosen = null,
  state = 'idle',
  size = 24,
  className,
}: {
  subagentType: string
  chosen?: string | null
  state?: MemberState
  size?: number
  className?: string
}) {
  const known = useFace(subagentType)
  const character = characterOf(subagentType, chosen ?? known)
  const mood: Mood = size >= DETAIL_FROM ? moodOf(state) : 'default'
  return (
    <img
      src={SPRITES[character][mood]}
      alt={character}
      width={size}
      height={size}
      draggable={false}
      className={cn('zt-sprite flex-none object-contain', `zt-sprite--${mood}`, className)}
      style={{ width: size, height: size, ['--zt-sprite-phase' as string]: `-${phaseOf(subagentType)}ms` }}
    />
  )
}

export function spriteSrc(character: CharacterId, mood: Mood = 'default'): string {
  return SPRITES[character][mood]
}
