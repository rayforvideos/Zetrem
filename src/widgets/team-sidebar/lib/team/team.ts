import type { TeamMember } from './team.types'

import type { AgentDef } from '@/entities/agent-def'
import { personaOf } from '@/entities/teammate'
import type { RosterMember, RosterState } from '@/entities/teammate'

const RANK: Record<RosterState, number> = { waiting: 0, working: 1, done: 2, idle: 3 }

export function team(
  defs: AgentDef[],
  sessionNames: string[],
  roster: RosterMember[],
  lockedTo: string[] | null = null,
): TeamMember[] {
  const allowed = lockedTo === null ? null : new Set(lockedTo)
  const live = new Map(roster.map((member) => [member.type, member]))
  const loaded = new Set(sessionNames)

  return defs
    .map((def) => {
      const working = live.get(def.name)
      const isLoaded = loaded.has(def.name)
      return {
        type: def.name,
        name: personaOf(def.name).name,
        description: def.description,
        model: def.model,
        character: def.character,
        origin: def.source,
        loaded: isLoaded,
        callable: isLoaded && (allowed === null || allowed.has(def.name)),
        state: working?.state ?? 'idle',
        note: working?.note ?? null,
        sessionId: working?.sessionId ?? null,
      }
    })
    .sort((a, b) => RANK[a.state] - RANK[b.state] || a.name.localeCompare(b.name))
}
