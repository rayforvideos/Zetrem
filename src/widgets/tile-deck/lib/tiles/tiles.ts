import type { AgentSession } from '@/entities/agent-session'
import { helpersOf, topLevel } from '@/entities/agent-session'
import type { Tile } from './tiles.types'

// The deck is handed every session at once. Only the ones the orchestrator
// spawned itself stand as tiles; everyone else belongs to the tile of whoever
// called them in.
export function tilesOf(sessions: AgentSession[]): Tile[] {
  return topLevel(sessions).map((session) => ({
    session,
    helpers: helpersOf(sessions, session.id),
  }))
}
