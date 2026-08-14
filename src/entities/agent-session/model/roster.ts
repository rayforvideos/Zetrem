import type { AgentSession } from './session'
import type { Persona } from './persona'
import { personaOf } from './persona'

export type RosterState = 'idle' | 'working' | 'waiting' | 'done'

export type RosterMember = {
  type: string
  persona: Persona
  state: RosterState
  note: string | null
  sessionId: string | null
}

const RANK: Record<RosterState, number> = { waiting: 0, working: 1, done: 2, idle: 3 }

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
    const state: RosterState =
      session.status === 'waiting' ? 'waiting' : session.status === 'working' ? 'working' : 'done'
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
