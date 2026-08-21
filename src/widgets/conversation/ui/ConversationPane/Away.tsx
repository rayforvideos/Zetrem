import { AgentSprite } from '@/entities/agent-session/ui/AgentSprite/AgentSprite'
import { UserFace } from '@/entities/user'
import type { FaceId } from '@/entities/user'
import { reachOf } from '@/shared/lib/reach/reach'
import type { Away as Waiting } from '../../lib/away/away.types'
import { elapsedLabel } from '../../lib/working/working'

export function Away({ away, face, nowMs }: { away: Waiting; face: FaceId; nowMs: number }) {
  const waited = nowMs - away.sinceMs
  const many = away.count > 1

  return (
    <div
      data-away={away.count}
      className="zt-rise relative flex flex-none items-center gap-2.5 overflow-hidden rounded-xl py-2 pr-3 pl-4"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 rounded-l-xl bg-gradient-to-r from-foreground/6 to-transparent transition-[width] duration-1000 ease-linear"
        style={{ width: `${reachOf(waited)}%` }}
      />
      <span data-face className="relative flex size-6 flex-none items-center">
        <UserFace face={face} size={24} className="max-w-none" />
      </span>
      <span className="relative flex-none text-sm text-muted-foreground">{away.verb}</span>
      <span className="relative flex min-w-0 flex-1 items-center gap-2 font-mono text-xs text-muted-foreground">
        {many ? (
          <span className="truncate">{away.many}</span>
        ) : away.one !== undefined ? (
          <>
            <span className="flex-none">
              <AgentSprite subagentType={away.subagentType} size={16} />
            </span>
            <span className="truncate">{away.one}</span>
          </>
        ) : (
          <>
            <span className="zt-breath flex-none">
              <AgentSprite subagentType={away.subagentType} size={16} />
            </span>
            <span className="truncate">
              {away.name}
              {away.doing.length > 0 && ` · ${away.doing}`}
            </span>
          </>
        )}
      </span>
      <span className="relative ml-auto flex-none font-mono text-xs tabular-nums text-muted-foreground">
        {elapsedLabel(waited)}
      </span>
    </div>
  )
}
