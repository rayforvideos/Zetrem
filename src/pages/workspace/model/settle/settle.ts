import type { AgentSession } from '@/entities/agent-session'

export const REPORTED_QUIET_MS = 6000
export const IDLE_QUIET_MS = 45_000

type Quiet = { nowMs: number; parentWorking: boolean }

function silenceOf(session: AgentSession, nowMs: number): number {
  return nowMs - (session.lastSeenAtMs ?? session.startedAtMs)
}

export function settled(children: AgentSession[], at: Quiet): string[] {
  return children
    .filter((session) => session.status !== 'done')
    .filter((session) => {
      const silence = silenceOf(session, at.nowMs)
      if (session.status === 'reported') return silence >= REPORTED_QUIET_MS
      return !at.parentWorking && silence >= IDLE_QUIET_MS
    })
    .map((session) => session.id)
}
