import type { AgentSession } from '@/entities/agent-session'
import { topLevel } from '@/entities/agent-session'

// A subagent a teammate called in itself is shown folded into that teammate's
// tile, so it never earns a tile — and never a seat in the deck — of its own.
export function arrived(children: AgentSession[], placed: Set<string>): string[] {
  return topLevel(children)
    .filter((session) => session.status !== 'done' && !placed.has(session.id))
    .map((session) => session.id)
}

// The store was emptied under this tile, so nothing will ever report it finished; it
// has to be let go on sight.
export function orphaned(children: AgentSession[], onScreen: Set<string>): string[] {
  const alive = new Set(children.map((session) => session.id))
  return [...onScreen].filter((id) => !alive.has(id))
}

export function retired(
  children: AgentSession[],
  onScreen: Set<string>,
  nowMs: number,
  dwellMs: number,
): string[] {
  return children
    .filter((session) => session.status === 'done' && onScreen.has(session.id))
    .filter((session) => nowMs - (session.endedAtMs ?? session.startedAtMs) >= dwellMs)
    .map((session) => session.id)
}
