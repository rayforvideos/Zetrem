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
      // A child the CLI tracks by task id gets an explicit end-of-life event
      // (childStateKnown); guessing from silence would close a teammate that
      // is merely between notifications and make its tile flicker.
      if (told(session)) return false
      if (session.status === 'reported') {
        return silenceOf(session, at.nowMs) >= REPORTED_QUIET_MS
      }
      if (session.status !== 'working') return false
      return !at.parentWorking && silenceOf(session, at.nowMs) >= LOST_QUIET_MS
    })
    .map((session) => session.id)
}
