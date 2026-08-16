import { FACES, tidyUserName } from '@/entities/user'
import type { FaceId } from '@/entities/user'
import { FACE_ART } from '@/entities/user/ui/UserFace/faces'
import { cn } from '@/shared/lib/cn'
import { Field, FieldDescription, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group'

export function YouField({
  name,
  face,
  onName,
  onFace,
}: {
  name: string
  face: FaceId
  onName(next: string): void
  onFace(next: FaceId): void
}) {
  return (
    <Field>
      <FieldLabel className="text-muted-foreground">You</FieldLabel>
      <div className="flex items-center gap-2.5">
        <Input
          value={name}
          onChange={(event) => onName(tidyUserName(event.target.value))}
          placeholder="Your name"
          aria-label="Your name"
          className="h-11 min-w-0 flex-1 rounded-xl bg-card px-3.5"
        />
        <RadioGroup
          value={face}
          onValueChange={(next) => onFace(next as FaceId)}
          className="flex flex-none gap-1"
          aria-label="Your face"
        >
          {FACES.map((one) => (
            <label
              key={one}
              title={one}
              className={cn(
                'flex size-11 cursor-pointer items-center justify-center rounded-xl transition-colors',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/70',
                one === face ? 'bg-accent' : 'hover:bg-card',
              )}
            >
              <RadioGroupItem value={one} aria-label={one} className="sr-only" />
              <img
                src={FACE_ART[one]}
                alt={one}
                width={26}
                height={26}
                draggable={false}
                className={cn('size-[26px] object-contain', one === face ? '' : 'opacity-70')}
              />
            </label>
          ))}
        </RadioGroup>
      </div>
      <FieldDescription>
        Zetrem greets you by this name, and your face marks the work in flight.
      </FieldDescription>
    </Field>
  )
}
