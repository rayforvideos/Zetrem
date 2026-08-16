import { ChevronDown, ChevronUp } from 'lucide-react'
import type { ReactNode } from 'react'
import type { StatusState } from '@/entities/agent-session'
import type { Connector } from '@/entities/connector'
import { ClaudeMark } from '@/shared/graphics/ClaudeMark/ClaudeMark'
import { Button } from '@/shared/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { cn } from '@/shared/lib/cn'
import { USAGE_BAR } from '@/shared/config/theme'
import { cells } from '@/widgets/status-bar'
import { chatLine, marksOfStatus, quietLine, spendLine } from '../../lib/strip/strip'

type UsageBarProps = {
  status: StatusState
  connectors: Connector[]
  nowMs: number
  open: boolean
  details: ReactNode
  onToggle(): void
}

export function UsageBar({ status, connectors, nowMs, open, details, onToggle }: UsageBarProps) {
  const marks = marksOfStatus(status, nowMs)
  const chat = chatLine(status)
  const spend = spendLine(status)
  const quiet = quietLine(status)
  const session = cells(status, connectors)

  return (
    <footer
      data-usage-bar
      style={{ height: USAGE_BAR.height }}
      className="relative z-[4] flex flex-none items-center gap-4 overflow-hidden border-t border-border bg-card/40 pr-3.5 pl-4 font-mono text-xs tabular-nums"
    >
      <ClaudeMark data-mark className="flex-none text-claude" />

      {marks.map((mark) => (
        <span
          key={mark.key}
          data-usage-mark={mark.key}
          title={mark.hint}
          className={cn(
            'flex flex-none items-center gap-1.5',
            mark.warn ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          <span className="relative h-1 w-8 flex-none overflow-hidden rounded-full bg-muted">
            <span
              data-fill
              className="absolute inset-y-0 left-0 rounded-full bg-current"
              style={{ width: `${Math.min(100, Math.max(0, mark.percent))}%` }}
            />
          </span>
          {mark.label.length > 0 && <span>{mark.label}</span>}
          <span>{mark.percent}%</span>
          {mark.left !== null && <span className="text-muted-foreground">· {mark.left}</span>}
        </span>
      ))}

      {quiet !== null && (
        <span
          data-quiet={status.usage}
          className={cn(
            'truncate text-muted-foreground',
            status.usage === 'unread' && 'zt-breath',
          )}
        >
          {quiet}
        </span>
      )}

      <span className="ml-auto flex min-w-0 flex-none items-center gap-4 text-muted-foreground">
        {session.map((cell) => (
          <span
            key={cell.key}
            data-session-cell={cell.key}
            className={cn('flex-none truncate', cell.warn && 'text-foreground')}
          >
            {cell.text}
          </span>
        ))}
        {chat !== null && <span data-chat>{chat}</span>}
        {spend !== null && <span data-spend>{spend}</span>}
      </span>

      <Popover open={open} onOpenChange={onToggle}>
        <PopoverTrigger asChild>
          <Button
            variant="quiet"
            size="bare"
            aria-expanded={open}
            aria-label="Session details"
            className="zt-hit flex-none"
          >
            {open ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          sideOffset={10}
          collisionPadding={12}
          className="w-[440px] max-w-[calc(100vw-24px)] rounded-2xl border-border bg-card p-0 shadow-2xl"
        >
          {details}
        </PopoverContent>
      </Popover>
    </footer>
  )
}
