import type { UsagePanelProps } from './UsagePanel.types'
import { CalendarDays, Hourglass, MessageSquare } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { spendLine, usageRows, waitingLine } from '../../lib/usage/usage'


function markOf(key: string): LucideIcon {
  if (key === 'context') return MessageSquare
  if (key === 'five_hour') return Hourglass
  return CalendarDays
}

export function UsagePanel({ status, sessionLive, avatar }: UsagePanelProps) {
  const rows = usageRows(status)
  const spend = spendLine(status)
  const waiting = waitingLine(status, sessionLive)

  return (
    <div data-usage className="flex flex-none flex-col pt-5 pr-3 pb-2">
      <div className="border-t border-border pt-4 pb-1.5 px-2 text-xs tracking-wide text-muted-foreground">
        Usage
      </div>

      {waiting !== null && (
        <p className="px-2 text-xs leading-snug text-muted-foreground">{waiting}</p>
      )}

      <div className="flex flex-col gap-0.5">
        {rows.map((row) => {
          const Mark = markOf(row.key)
          return (
            <div
              key={row.key}
              className={cn(
                'flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5',
                row.warn ? 'text-foreground' : 'text-muted-foreground',
              )}
              title={row.hint}
            >
              <span
                className="flex flex-none items-center justify-center rounded-full border border-border"
                style={{ width: avatar, height: avatar }}
              >
                <Mark className="size-3.5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm leading-tight">{row.label}</span>
                {row.warn && (
                  <span className="truncate text-xs leading-tight text-muted-foreground">
                    {row.hint}
                  </span>
                )}
              </span>
              <span className="flex-none font-mono text-xs tabular-nums">
                {row.percent === null ? row.amount : `${row.percent}%`}
              </span>
            </div>
          )
        })}
      </div>

      {spend !== null && (
        <span className="px-2 pt-1.5 font-mono text-xs tabular-nums text-muted-foreground">
          {spend}
        </span>
      )}
    </div>
  )
}
