import type { AgentDef } from '@/entities/agent-def'
import type { RosterMember, RosterState } from '@/entities/agent-session'

export type Origin = 'project' | 'user' | 'session'

export type TeamMember = {
  type: string
  name: string
  description: string
  model: string | null
  origin: Origin
  loaded: boolean
  callable: boolean
  state: RosterState
  note: string | null
  sessionId: string | null
}

const RANK: Record<RosterState, number> = { waiting: 0, working: 1, done: 2, idle: 3 }

// 명단에는 Zetrem 에서 들인 사람만 선다. 엔진이 데려온 사람들(Explore·Plan 같은 것)은
// 우리가 고용한 사람이 아니라 엔진의 부속이라 여기 세우지 않는다 — 지금 도는 것이 있으면
// 그건 작업 지도가 말한다.
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
        name: def.name,
        description: def.description,
        model: def.model,
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
