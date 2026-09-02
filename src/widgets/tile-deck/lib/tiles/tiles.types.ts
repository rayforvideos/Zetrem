import type { AgentSession } from '@/entities/agent-session'

// One tile: a teammate the orchestrator spawned, together with the subagents
// that teammate called in, which are folded into its tile instead of taking
// tiles of their own.
export type Tile = {
  session: AgentSession
  helpers: AgentSession[]
}
