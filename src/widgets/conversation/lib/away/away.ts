import type { AgentSession } from '@/entities/agent-session'
import { personaOf } from '@/entities/teammate'
import type { Turn } from '@/entities/conversation'
import type { Away } from './away.types'
import { t } from '@lingui/core/macro'

export function spokeAtMs(turns: Turn[]): number {
  return turns.findLast((turn) => turn.role === 'assistant')?.startedAtMs ?? 0
}

function backAtMs(session: AgentSession): number {
  return session.lastSeenAtMs ?? session.startedAtMs
}

function crewLine(session: AgentSession): { name: string; subagentType: string; doing: string } {
  const kind = session.subagentType || session.label
  return { name: personaOf(kind).name, subagentType: kind, doing: session.headline.trim() }
}

export function awayOf(sessions: AgentSession[], spokeAtMs = 0): Away | null {
  const out = sessions.filter((one) => one.status === 'working' || one.status === 'waiting')
  const first = out[0]
  if (first !== undefined) {
    return {
      verb: t`Waiting on`,
      count: out.length,
      ...crewLine(first),
      sinceMs: Math.min(...out.map((one) => one.startedAtMs)),
      many: t`${out.length} teammates`,
    }
  }

  const back = sessions.filter(
    (one) =>
      one.status !== 'working' &&
      one.status !== 'waiting' &&
      backAtMs(one) > spokeAtMs &&
      one.headline.trim().length > 0,
  )
  const said = back[0]
  if (said === undefined) return null
  const who = crewLine(said)
  return {
    verb: t`Reading`,
    count: back.length,
    ...who,
    doing: '',
    sinceMs: Math.min(...back.map(backAtMs)),
    many: t`${back.length} reports`,
    one: t`${who.name}'s report`,
  }
}
