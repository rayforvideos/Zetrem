import type { WorkMap } from './branches.types'

import type { AgentSession, SessionStatus } from '@/entities/agent-session'

export const MIN_SPAN_MS = 20_000

export function workMap(sessions: AgentSession[], nowMs: number): WorkMap {
  if (sessions.length === 0) return { branches: [], lanes: 0, spanMs: MIN_SPAN_MS }

  const origin = Math.min(...sessions.map((session) => session.startedAtMs))
  const spanMs = Math.max(MIN_SPAN_MS, nowMs - origin)

  const ordered = [...sessions].sort((a, b) => a.startedAtMs - b.startedAtMs)
  const branches = ordered.map((session, lane) => {
    const live = session.status !== 'done'
    const startX = clamp((session.startedAtMs - origin) / spanMs)
    const endX = live ? 1 : clamp((endStamp(session) - origin) / spanMs)
    return {
      id: session.id,
      label: session.label,
      subagentType: session.subagentType,
      status: session.status,
      startX,
      endX: Math.max(endX, startX),
      lane,
      live,
    }
  })

  return { branches, lanes: branches.length, spanMs }
}

function endStamp(session: AgentSession): number {
  return session.endedAtMs ?? session.startedAtMs
}

function clamp(ratio: number): number {
  if (Number.isNaN(ratio)) return 0
  return Math.min(1, Math.max(0, ratio))
}
