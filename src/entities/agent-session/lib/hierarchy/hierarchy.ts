import type { AgentSession } from '../../model/session/session.types'

// Sessions the orchestrator spawned directly, i.e. without a parent of their own.
export function topLevel(sessions: AgentSession[]): AgentSession[] {
  return sessions.filter((session) => session.parentId === undefined)
}

// A given session's own subagents, oldest first, i.e. its grandchildren from the
// orchestrator's point of view.
export function helpersOf(sessions: AgentSession[], parentId: string): AgentSession[] {
  return sessions
    .filter((session) => session.parentId === parentId)
    .sort((a, b) => a.startedAtMs - b.startedAtMs)
}
