import { Check } from 'lucide-react'
import { read } from '@/shared/lib/say/read'
import type { Said } from '@/shared/lib/say/read.types'
import { Field, FieldDescription, FieldLabel } from '@/shared/ui/field'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'

type Option = { id: string; label: Said; hint: Said }

type ChoiceFieldProps = {
  label: string
  options: readonly Option[]
  chosen: string
  onChoose(id: string): void
}

function hintOf(options: readonly Option[], chosen: string): string {
  const found = options.find((option) => option.id === chosen)?.hint
  return found === undefined ? '' : read(found)
}

export function ChoiceField({ label, options, chosen, onChoose }: ChoiceFieldProps) {
  return (
    <Field>
      <FieldLabel className="text-muted-foreground">{label}</FieldLabel>
      <div>
        <ToggleGroup
          type="single"
          value={chosen}
          onValueChange={(id) => id && onChoose(id)}
          variant="outline"
          size="sm"
          className="rounded-full bg-card p-1"
        >
          {options.map((option) => (
            <ToggleGroupItem
              key={option.id}
              value={option.id}
              className="gap-1.5 rounded-full border-transparent px-4 data-[state=on]:bg-chosen data-[state=on]:text-chosen-foreground"
            >
              {/* The tick is held in a slot the same width whether it shows or
                  not, so choosing does not shuffle the row along. It is here
                  because a fill alone leaves the choice to colour. */}
              <span className="inline-flex size-3.5 flex-none items-center justify-center">
                {option.id === chosen && <Check className="size-3.5" aria-hidden="true" />}
              </span>
              {read(option.label)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <FieldDescription>{hintOf(options, chosen)}</FieldDescription>
    </Field>
  )
}
