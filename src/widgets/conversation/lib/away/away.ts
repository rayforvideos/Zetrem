import type { AgentSession } from '@/entities/agent-session'
import { personaOf } from '@/entities/agent-session'
import type { Turn } from '@/entities/conversation'
import type { Away } from './away.types'

export function spokeAtMs(turns: Turn[]): number {
  for (let at = turns.length - 1; at >= 0; at -= 1) {
    const turn = turns[at]
    if (turn !== undefined && turn.role === 'assistant') return turn.startedAtMs
  }
  return 0
}

const READ_WINDOW_MS = 120_000

function backAtMs(session: AgentSession): number {
  return session.lastSeenAtMs ?? session.startedAtMs
}

function crewLine(session: AgentSession): { name: string; subagentType: string; doing: string } {
  const kind = session.subagentType || session.label
  return { name: personaOf(kind).name, subagentType: kind, doing: session.headline.trim() }
}

export function awayOf(sessions: AgentSession[], spokeAtMs = 0, nowMs = Date.now()): Away | null {
  const out = sessions.filter((one) => one.status === 'working')
  const first = out[0]
  if (first !== undefined) {
    return {
      verb: 'Waiting on',
      count: out.length,
      ...crewLine(first),
      sinceMs: Math.min(...out.map((one) => one.startedAtMs)),
      many: `${out.length} teammates`,
    }
  }

  const back = sessions.filter(
    (one) =>
      one.status !== 'working' &&
      backAtMs(one) > spokeAtMs &&
      nowMs - backAtMs(one) < READ_WINDOW_MS &&
      one.headline.trim().length > 0,
  )
  const said = back[0]
  if (said === undefined) return null
  const who = crewLine(said)
  return {
    verb: 'Reading',
    count: back.length,
    ...who,
    doing: '',
    sinceMs: Math.min(...back.map(backAtMs)),
    many: `${back.length} reports`,
    one: `${who.name}'s report`,
  }
}
