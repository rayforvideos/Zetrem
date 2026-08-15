import { Field, FieldDescription, FieldLabel } from '@/shared/ui/field'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'

type Option = { id: string; label: string; hint: string }

type ChoiceFieldProps = {
  label: string
  options: readonly Option[]
  chosen: string
  onChoose(id: string): void
}

export function hintOf(options: readonly Option[], chosen: string): string {
  return options.find((option) => option.id === chosen)?.hint ?? ''
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
              className="rounded-full border-transparent px-4"
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <FieldDescription>{hintOf(options, chosen)}</FieldDescription>
    </Field>
  )
}
