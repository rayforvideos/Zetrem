import type { AgentSession } from '@/entities/agent-session'

export const REPORTED_QUIET_MS = 6000
export const LOST_QUIET_MS = 600_000

type Quiet = { nowMs: number; parentWorking: boolean }

function silenceOf(session: AgentSession, nowMs: number): number {
  return nowMs - (session.lastSeenAtMs ?? session.startedAtMs)
}

function told(session: AgentSession): boolean {
  return session.taskId !== undefined && session.taskId.length > 0
}

export function settled(children: AgentSession[], at: Quiet): string[] {
  return children
    .filter((session) => session.status !== 'done')
    .filter((session) => {
      if (session.status === 'reported') {
        return silenceOf(session, at.nowMs) >= REPORTED_QUIET_MS
      }
      if (session.status !== 'working') return false
      if (told(session)) return false
      return !at.parentWorking && silenceOf(session, at.nowMs) >= LOST_QUIET_MS
    })
    .map((session) => session.id)
}
