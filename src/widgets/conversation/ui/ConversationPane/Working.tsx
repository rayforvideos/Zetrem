import { useEffect, useRef } from 'react'
import type { Turn } from '@/entities/conversation'
import { AgentSprite } from '@/entities/agent-session/ui/AgentSprite/AgentSprite'
import { ToolIcon } from '@/shared/graphics/tool-icon'
import { reachOf } from '@/shared/lib/reach/reach'
import { doingOf, elapsedLabel, tokenLabel } from '../../lib/working/working'

export function Working({
  turn,
  nowMs,
  startedAtMs,
  tokensOut,
  agent,
}: {
  turn: Turn | null
  nowMs: number
  startedAtMs: number
  tokensOut: number
  agent: string
}) {
  const baseline = useRef<number | null>(null)
  useEffect(() => {
    if (baseline.current === null) baseline.current = tokensOut
  }, [tokensOut])

  const spent = tokensOut - (baseline.current ?? tokensOut)
  const tokens = tokenLabel(spent)
  const doing = doingOf(turn)
  const waited = nowMs - startedAtMs

  return (
    <div
      data-working
      data-doing={doing.verb.toLowerCase()}
      className="zt-rise relative flex flex-none items-center gap-3 overflow-hidden rounded-xl px-2.5 py-2"
    >
      <span
        data-reach
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 rounded-xl bg-gradient-to-r from-foreground/8 to-transparent"
        style={{ width: `${reachOf(waited)}%` }}
      />
      <AgentSprite subagentType={agent} state="working" size={26} className="relative flex-none" />
      {doing.shape !== null && (
        <span className="relative flex-none text-muted-foreground">
          <ToolIcon shape={doing.shape} />
        </span>
      )}
      <span className="zt-shimmer relative flex-none text-sm">{doing.verb}</span>
      {doing.target.length > 0 && (
        <span
          data-target
          className="relative min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground"
        >
          {doing.target}
        </span>
      )}
      <span className="relative ml-auto flex flex-none items-baseline gap-3 font-mono text-xs tabular-nums text-muted-foreground">
        <span data-elapsed>{elapsedLabel(waited)}</span>
        {tokens !== '' && <span data-tokens>{tokens}</span>}
      </span>
    </div>
  )
}
