import type { Call } from '@/entities/agent-session'
import { ChangeDiff, ToolIcon, shapeOfLine } from '@/entities/tool'
import { t } from '@lingui/core/macro'

// Everything the teammate reached for, in the order it happened, with each
// edit laid out whole under the call that made it. The tile only ever shows a
// glimpse of one change; this is where the rest of them live.
export function CallStream({ calls }: { calls: Call[] }) {
  return (
    <div className="flex flex-col gap-1 pt-2">
      <span className="mb-1 text-xs tracking-[0.08em] text-muted-foreground">{t`What they did`}</span>
      {calls.length === 0 && (
        <span className="text-xs text-muted-foreground">{t`Nothing yet`}</span>
      )}
      {calls.map((call) => {
        const groups = call.change ?? []
        return (
          <div key={call.id} className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <ToolIcon shape={shapeOfLine(call.line)} />
              <span className="truncate">{call.line}</span>
              {call.failed ? (
                <span className="ml-auto flex-none text-removed">{t`failed`}</span>
              ) : (
                call.note.length > 0 && (
                  <span className="ml-auto flex-none truncate">{call.note}</span>
                )
              )}
            </span>
            {groups.length > 0 && (
              // No scroll box of its own: ChangeDiff already gives each group a
              // pre that scrolls, and one box inside another traps the wheel.
              <div data-change className="mb-1 rounded-lg border border-border bg-card p-3">
                <ChangeDiff groups={groups} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
