import type { Chore } from '@/entities/conversation'
import { ToolIcon } from '@/shared/graphics/tool-icon'
import { reachOf } from '@/shared/lib/reach/reach'
import { elapsedLabel } from '../../lib/working/working'
import { t } from '@lingui/core/macro'

const SHELL = { kind: 'command', command: '' } as const

export function Chores({ chores, nowMs }: { chores: Chore[]; nowMs: number }) {
  if (chores.length === 0) return null

  return (
    <div data-chores className="flex flex-none flex-col gap-1">
      {chores.map((chore) => {
        const waited = nowMs - chore.startedAtMs
        return (
          <div
            key={chore.id}
            data-chore={chore.id}
            className="zt-rise relative flex items-center gap-3 overflow-hidden rounded-xl px-2.5 py-1.5"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 rounded-xl bg-gradient-to-r from-foreground/6 to-transparent"
              style={{ width: `${reachOf(waited)}%` }}
            />
            <span className="zt-breath relative flex-none text-muted-foreground">
              <ToolIcon shape={SHELL} />
            </span>
            <span className="relative flex-none text-xs text-muted-foreground">{t`In the background`}</span>
            <span className="relative min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground/70">
              {chore.line}
            </span>
            <span className="relative flex-none font-mono text-xs tabular-nums text-muted-foreground">
              {elapsedLabel(waited)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
