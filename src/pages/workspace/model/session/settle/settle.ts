import type { AgentSession } from '@/entities/agent-session'

export const REPORTED_QUIET_MS = 6000
// A child that was done but held for its shell: the shell's end is meant to
// park it, but that end can be missed (a session restarted, a shell the
// runtime dropped), and then no event about the child ever comes. If nothing
// has been heard this long since the hold, the report stands as its end.
export const HELD_QUIET_MS = 60_000
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
      if (session.heldAtMs !== undefined) {
        const since = Math.max(session.heldAtMs, session.lastSeenAtMs ?? 0)
        return at.nowMs - since >= HELD_QUIET_MS
      }
      // A child the CLI tracks by task id gets an explicit end (childStateKnown);
      // guessing from silence would close one merely between notifications.
      if (told(session)) return false
      return !at.parentWorking && silenceOf(session, at.nowMs) >= LOST_QUIET_MS
    })
    .map((session) => session.id)
}
