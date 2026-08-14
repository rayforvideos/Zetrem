import type { StatusState } from '@/entities/agent-session'
import { cn } from '@/shared/lib/cn'
import { Progress } from '@/shared/ui/progress'
import { spendLine, usageRows, waitingLine } from '../../lib/usage/usage'

type UsagePanelProps = {
  status: StatusState
  sessionLive: boolean
}

export function UsagePanel({ status, sessionLive }: UsagePanelProps) {
  const rows = usageRows(status)
  const spend = spendLine(status)
  const waiting = waitingLine(status, sessionLive)

  return (
    <div data-usage className="flex flex-none flex-col gap-2.5 border-t border-border px-2 py-3">
      {rows.map((row) => (
        <div key={row.key} className="flex flex-col gap-1.5" title={row.hint}>
          <div className="flex items-baseline justify-between gap-2">
            <span
              className={cn(
                'truncate text-xs',
                row.warn ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {row.label}
            </span>
            <span className="flex-none font-mono text-xs tabular-nums text-muted-foreground">
              {row.percent === null ? row.amount : `${row.percent}%`}
            </span>
          </div>
          {row.percent !== null && (
            <Progress
              value={row.percent}
              aria-label={`${row.label} ${row.percent}% used`}
              className={cn(
                'h-1 bg-border',
                row.warn ? '[&>*]:bg-foreground' : '[&>*]:bg-muted-foreground',
              )}
            />
          )}
          {row.warn && <span className="text-xs leading-none text-foreground">{row.hint}</span>}
        </div>
      ))}
      {spend !== null && (
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{spend}</span>
      )}
      {waiting !== null && (
        <span className="text-xs leading-snug text-muted-foreground">{waiting}</span>
      )}
    </div>
  )
}
