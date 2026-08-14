import { ChevronDown, ChevronUp } from 'lucide-react'
import type { StatusState } from '@/entities/agent-session'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/cn'
import { cells } from '../lib/format'

type StatusBarProps = {
  status: StatusState
  open: boolean
  onToggle(): void
}

export function StatusBar({ status, open, onToggle }: StatusBarProps) {
  const items = cells(status)
  if (items.length === 0 && !open) {
    return (
      <div className="flex flex-none justify-end">
        <Button
          variant="quiet"
          size="bare"
          onClick={onToggle}
          aria-expanded={open}
          aria-label="Session details"
        >
          <ChevronUp className="size-3" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-none flex-col gap-1.5">
      <div className="h-px w-full bg-border" />
      <div className="flex items-center gap-2.5 font-mono text-xs tracking-wide">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
          {items.map((cell) => (
            <span
              key={cell.key}
              className={cn(
                'flex-none truncate tabular-nums',
                cell.warn ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {cell.text}
            </span>
          ))}
        </div>
        <Button
          variant="quiet"
          size="bare"
          onClick={onToggle}
          aria-expanded={open}
          aria-label="Session details"
          className="flex-none"
        >
          {open ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
        </Button>
      </div>
    </div>
  )
}
