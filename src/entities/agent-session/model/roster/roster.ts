import type { RosterMember, RosterState } from './roster.types'

import type { AgentSession } from '../session.types'
import type { Persona } from '../persona/persona.types'
import { personaOf } from '../persona/persona'

const RANK: Record<RosterState, number> = { waiting: 0, working: 1, done: 2, idle: 3 }

function rosterState(status: AgentSession['status']): RosterState {
  switch (status) {
    case 'waiting':
      return 'waiting'
    case 'working':
      return 'working'
    case 'reported':
    case 'done':
      return 'done'
  }
}

export function roster(agentTypes: string[], sessions: AgentSession[]): RosterMember[] {
  const seen = new Map<string, RosterMember>()

  for (const type of agentTypes) {
    if (seen.has(type)) continue
    seen.set(type, {
      type,
      persona: personaOf(type),
      state: 'idle',
      note: null,
      sessionId: null,
    })
  }

  for (const session of sessions) {
    const type = session.subagentType.length > 0 ? session.subagentType : session.label
    const state = rosterState(session.status)
    const current = seen.get(type)
    if (current !== undefined && RANK[current.state] <= RANK[state] && current.sessionId !== null) {
      continue
    }
    seen.set(type, {
      type,
      persona: personaOf(type),
      state,
      note: session.headline.length > 0 ? session.headline : null,
      sessionId: session.id,
    })
  }

  return [...seen.values()].sort((a, b) => RANK[a.state] - RANK[b.state])
}
