import type { AgentSession } from '@/entities/agent-session'
import type { FaceId } from '@/entities/user'
import { boardPresence, showsBoard } from '../../lib/board-phase/board-phase'
import type { BoardPhase } from '../../lib/board-phase/board-phase.types'
import type { Rect } from '../../lib/grid/grid.types'
import { AgentTile } from '../AgentTile/AgentTile'
import { CrewBoard } from '../CrewBoard/CrewBoard'
import type { PlacedTile } from './CrewLayer.types'

type CrewLayerProps = {
  phase: BoardPhase
  // The tiles to draw this frame. While the deck boards these are the seats the
  // tiles last held, every one of them closing; while it unboards they are the
  // tiles arriving under the board that is leaving.
  tiles: PlacedTile[]
  // Everyone the board would show.
  sessions: AgentSession[]
  helpers: Map<string, AgentSession[]>
  board: Rect
  // The board needs the deck settled into its grid to have somewhere to stand.
  // A board on its way out stays on without it, so that it can be seen to go —
  // unless the last teammate went with it, and there is nothing left to show.
  grid: boolean
  nowMs: number
  face: FaceId
  name: string
  openId: string | null
  sweeping: boolean
  attention: string | null
  // The run has stopped for the person, so every teammate still going is going
  // nowhere until that is answered.
  held?: boolean
  onOpen(id: string | null): void
  onDismiss?: (id: string) => void
}

// The crew side of the deck: tiles, or the board, or — for the length of a
// flip — both at once, one arriving over the other as it leaves.
export function CrewLayer({
  phase,
  tiles,
  sessions,
  helpers,
  board,
  grid,
  nowMs,
  face,
  name,
  openId,
  sweeping,
  attention,
  held = false,
  onOpen,
  onDismiss,
}: CrewLayerProps) {
  const presence = boardPresence(phase)

  return (
    <>
      {showsBoard(phase) && sessions.length > 0 && (grid || presence === 'leaving') && (
        <CrewBoard
          sessions={sessions}
          helpers={helpers}
          face={face}
          name={name}
          rect={board}
          nowMs={nowMs}
          openId={openId}
          held={held}
          presence={presence}
          onOpen={onOpen}
        />
      )}
      {tiles.map((tile) => (
        <AgentTile
          key={tile.session.id}
          session={tile.session}
          helpers={helpers.get(tile.session.id) ?? EMPTY_LIST}
          rect={tile.rect}
          delayMs={tile.delayMs}
          nowMs={nowMs}
          sweeping={sweeping}
          closing={tile.closing}
          attention={!tile.closing && tile.session.id === attention}
          held={held}
          onDismiss={onDismiss === undefined ? undefined : () => onDismiss(tile.session.id)}
        />
      ))}
    </>
  )
}

const EMPTY_LIST: AgentSession[] = []
