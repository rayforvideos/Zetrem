import type { AgentSession } from '@/entities/agent-session'

export function arrived(children: AgentSession[], placed: Set<string>): string[] {
  return children
    .filter((session) => session.status !== 'done' && !placed.has(session.id))
    .map((session) => session.id)
}

// A tile whose session is not in the list at all: the store was emptied under
// it — a new session, a stop, a project swapped. Nothing will ever report it
// finished, so it has to be let go on sight or the board keeps its seat.
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
