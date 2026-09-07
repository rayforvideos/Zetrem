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

function tracked(session: AgentSession): boolean {
  return session.taskId !== undefined && session.taskId.length > 0
}

// `say` hears which rule closed each tile, so the chat's diagnostics can name
// it. It is not what decides anything: the rules are the same either way.
export function settled(
  children: AgentSession[],
  at: Quiet,
  say: (id: string, rule: string) => void = () => undefined,
): string[] {
  const closing: string[] = []
  for (const session of children) {
    const rule = ruleFor(session, at)
    if (rule === null) continue
    say(session.id, rule)
    closing.push(session.id)
  }
  return closing
}

// Which silence rule, if any, says this tile is finished. In English: it is
// written into the diagnostics log, not onto the screen.
function ruleFor(session: AgentSession, at: Quiet): string | null {
  if (session.status === 'done') return null
  if (session.status === 'reported') {
    if (silenceOf(session, at.nowMs) < REPORTED_QUIET_MS) return null
    return 'the report stood and nothing more was said'
  }
  if (session.status !== 'working') return null
  if (session.heldAtMs !== undefined) {
    const since = Math.max(session.heldAtMs, session.lastSeenAtMs ?? 0)
    if (at.nowMs - since < HELD_QUIET_MS) return null
    return 'the held report stood: no end ever came for its shell'
  }
  // A child the CLI tracks by task id gets an explicit end (childStateKnown);
  // guessing from silence would close one merely between notifications.
  if (tracked(session)) return null
  if (at.parentWorking || silenceOf(session, at.nowMs) < LOST_QUIET_MS) return null
  return 'lost: the runtime never named it and it went quiet'
}
