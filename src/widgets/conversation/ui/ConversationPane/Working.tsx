import { useEffect, useRef } from 'react'
import type { Turn } from '@/entities/conversation'
import { AgentSprite } from '@/entities/teammate'
import { UserFace } from '@/entities/user'
import type { FaceId } from '@/entities/user'
import { ToolIcon } from '@/entities/tool'
import { reachOf } from '@/shared/lib/reach/reach'
import { doingOf, elapsedLabel, tokenLabel } from '../../lib/working/working'

export function Working({
  turns,
  face,
  nowMs,
  startedAtMs,
  tokensOut,
}: {
  turns: Turn[]
  face: FaceId
  nowMs: number
  startedAtMs: number
  tokensOut: number
}) {
  const baseline = useRef<number | null>(null)
  useEffect(() => {
    if (baseline.current === null) baseline.current = tokensOut
  }, [tokensOut])

  const spent = tokensOut - (baseline.current ?? tokensOut)
  const tokens = tokenLabel(spent)
  const doing = doingOf(turns, nowMs)
  const waited = nowMs - startedAtMs

  return (
    <div
      data-working
      data-doing={doing.verb.toLowerCase()}
      className="zt-rise relative flex flex-none items-center gap-2.5 overflow-hidden rounded-xl py-2 pr-3 pl-4"
    >
      <span
        data-reach
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 rounded-l-xl bg-gradient-to-r from-foreground/8 to-transparent transition-[width] duration-1000 ease-linear"
        style={{ width: `${reachOf(waited)}%` }}
      />
      <span data-face className="relative flex size-6 flex-none items-center">
        <UserFace face={face} size={24} className="max-w-none" />
      </span>
      <span className="zt-shimmer relative flex-none text-sm">{doing.verb}</span>
      {doing.shape !== null && (
        <span
          data-target
          className="relative flex min-w-0 flex-1 items-center gap-2 font-mono text-xs text-muted-foreground"
        >
          <span className="flex-none">
            {doing.shape.kind === 'agent' && doing.shape.subagentType.length > 0 ? (
              <AgentSprite subagentType={doing.shape.subagentType} size={16} />
            ) : (
              <ToolIcon shape={doing.shape} />
            )}
          </span>
          {doing.target.length > 0 && <span className="truncate">{doing.target}</span>}
        </span>
      )}
      <span className="relative ml-auto flex flex-none items-baseline gap-3 font-mono text-xs tabular-nums text-muted-foreground">
        <span data-elapsed>{elapsedLabel(waited)}</span>
        {tokens !== '' && <span data-tokens>{tokens}</span>}
      </span>
    </div>
  )
}
