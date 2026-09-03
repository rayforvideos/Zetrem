import type { AgentSession } from '@/entities/agent-session'
import type { Rect } from '../../lib/grid/grid.types'

// One teammate's tile, placed. A closing tile is one playing its way off the
// deck: either that teammate finished, or the board is coming up over it.
export type PlacedTile = {
  session: AgentSession
  rect: Rect
  delayMs: number
  closing: boolean
}
