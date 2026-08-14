import { useEffect, useRef } from 'react'
import type { Turn } from '@/entities/conversation'
import { AgentSprite } from '@/entities/agent-session/ui/AgentSprite/AgentSprite'
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

  return (
    <div
      data-working
      className="zt-rise flex flex-none items-center gap-2.5 border-t border-border px-2 pt-3"
    >
      <AgentSprite subagentType={agent} state="working" size={26} />
      <span className="zt-shimmer zt-dots min-w-0 flex-1 truncate text-sm">{doingOf(turn)}</span>
      <span className="flex flex-none items-baseline gap-4 font-mono text-xs tabular-nums text-muted-foreground">
        <span>{elapsedLabel(nowMs - startedAtMs)}</span>
        {tokens !== '' && <span>{tokens}</span>}
      </span>
    </div>
  )
}
