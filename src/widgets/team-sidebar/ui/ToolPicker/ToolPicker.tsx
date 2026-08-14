import { toolShape } from '@/shared/lib/tool-shape/tool-shape'
import { cn } from '@/shared/lib/cn'
import { ToolIcon } from '@/shared/graphics/tool-icon'
import { Button } from '@/shared/ui/button'

type ToolPickerProps = {
  known: string[]
  chosen: string[]
  onToggle(tool: string, on: boolean): void
}

export function ToolPicker({ known, chosen, onToggle }: ToolPickerProps) {
  if (known.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Reading what this session offers. The list fills in a moment.
      </p>
    )
  }
  const held = new Set(chosen)

  return (
    <div className="flex flex-wrap gap-1.5">
      {known.map((tool) => {
        const on = held.has(tool)
        return (
          <Button
            key={tool}
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={on}
            onClick={() => onToggle(tool, !on)}
            className={cn(
              'h-7 rounded-full border px-2.5 font-mono text-xs',
              on ? 'border-ring bg-card text-foreground' : 'border-border text-muted-foreground',
            )}
          >
            <ToolIcon shape={toolShape(tool, null)} />
            {tool}
          </Button>
        )
      })}
    </div>
  )
}
