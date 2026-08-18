import { CHARACTERS } from '@/entities/agent-session'
import type { CharacterId } from '@/entities/agent-session'
import { spriteSrc } from '@/entities/agent-session/ui/AgentSprite/AgentSprite'
import { cn } from '@/shared/lib/cn'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group'
import { t } from '@lingui/core/macro'

export function CharacterPicker({
  value,
  onChange,
}: {
  value: CharacterId
  onChange(next: CharacterId): void
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => onChange(next as CharacterId)}
      className="grid grid-cols-5 gap-1"
      aria-label={t`Character`}
    >
      {CHARACTERS.map((character) => (
        <label
          key={character}
          className={cn(
            'flex cursor-pointer items-center justify-center rounded-lg p-1 transition-colors',
            'has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
            character === value ? 'bg-accent' : 'hover:bg-card',
          )}
          title={character}
        >
          <RadioGroupItem value={character} aria-label={character} className="sr-only" />
          <img
            src={spriteSrc(character)}
            alt={character}
            width={28}
            height={28}
            draggable={false}
            className={cn('size-7 object-contain', character === value ? '' : 'opacity-70')}
          />
        </label>
      ))}
    </RadioGroup>
  )
}
