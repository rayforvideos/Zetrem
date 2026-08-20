import { Check } from 'lucide-react'
import { toolShape } from '@/shared/lib/tool-shape/tool-shape'
import { ToolIcon } from '@/shared/graphics/tool-icon'
import { Button } from '@/shared/ui/button'
import { t } from '@lingui/core/macro'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/ui/command'

type ToolPickerProps = {
  known: string[]
  chosen: string[]
  onToggle(tool: string, on: boolean): void
  onClear(): void
}

export function ToolPicker({ known, chosen, onToggle, onClear }: ToolPickerProps) {
  if (known.length === 0) {
    return (
      <p className="p-3 text-xs text-muted-foreground">
        {t`Reading what this session offers. The list fills in a moment.`}
      </p>
    )
  }
  const held = new Set(chosen)

  return (
    <Command className="bg-transparent">
      <CommandInput placeholder={t`Search tools`} />
      <CommandList className="max-h-64">
        <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">
          {t`No tool by that name.`}
        </CommandEmpty>
        <CommandGroup>
          {known.map((tool) => {
            const on = held.has(tool)
            return (
              <CommandItem
                key={tool}
                value={tool}
                onSelect={() => onToggle(tool, !on)}
                className="gap-2"
              >
                <ToolIcon shape={toolShape(tool, null)} />
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{tool}</span>
                <span className="flex size-3.5 flex-none items-center justify-center">
                  {on && <Check className="size-3.5" />}
                </span>
              </CommandItem>
            )
          })}
        </CommandGroup>
      </CommandList>
      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
        <span className="text-xs text-muted-foreground">
          {chosen.length === 0 ? t`Everything the session has` : t`${chosen.length} chosen`}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={chosen.length === 0}
          className="h-7 text-xs text-muted-foreground"
        >
          {t`Clear`}
        </Button>
      </div>
    </Command>
  )
}
