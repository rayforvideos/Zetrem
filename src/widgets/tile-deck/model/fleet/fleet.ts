import type { AgentSession } from '@/entities/agent-session'

export function arrived(children: AgentSession[], placed: Set<string>): string[] {
  return children
    .filter((session) => session.status !== 'done' && !placed.has(session.id))
    .map((session) => session.id)
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
