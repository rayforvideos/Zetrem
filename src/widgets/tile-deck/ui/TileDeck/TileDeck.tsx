import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { AgentSession } from '@/entities/agent-session'
import type { FaceId } from '@/entities/user'
import { Surface } from '@/shared/parts/Surface/Surface'
import { MOTION, staggerDelay } from '@/shared/config/motion/motion'
import { CHROME_TOP, GRID_PAD, SHELL_PAD } from '@/shared/config/theme'
import { attentionId } from '../../lib/attention/attention'
import { tilesCanLeave, tilesLeaving, tilesStanding } from '../../lib/board-phase/board-phase'
import {
  boardLayout,
  boarded,
  narrowLayout,
  observatoryLayout,
  roomToFan,
  soloRect,
} from '../../lib/grid/grid'
import type { Rect, Viewport } from '../../lib/grid/grid.types'
import { tilesOf } from '../../lib/tiles/tiles'
import type { DeckState } from '../../model/deck-machine/deck-machine.types'
import { closingIds, visibleIds } from '../../model/deck-machine/deck-machine'
import { useBoardPhase } from '../../model/useBoardPhase'
import { CrewLayer } from './CrewLayer'
import type { PlacedTile } from './CrewLayer.types'
import { CrewSheet } from '../CrewSheet/CrewSheet'

type TileDeckProps = {
  state: DeckState
  // Every session at once. The deck itself decides who stands as a tile and
  // whose work is folded into someone else's.
  sessions: AgentSession[]
  viewport: Viewport
  nowMs: number
  sidebarW?: number
  roster?: boolean
  face: FaceId
  name: string
  terminal: ReactNode
  onDismiss?: (id: string) => void
}

export function TileDeck({
  state,
  sessions,
  viewport,
  nowMs,
  sidebarW = 0,
  roster = false,
  face,
  name,
  terminal,
  onDismiss,
}: TileDeckProps) {
  const solo = soloRect(viewport)
  const advanced = useAdvancedFrame(state.kind)
  const sweeping = state.kind === 'fanning' || state.kind === 'merging'

  const atGrid = state.kind === 'fanned' || (state.kind === 'fanning' && advanced)

  const roll = tilesOf(sessions)
  const standingSessions = roll.map((tile) => tile.session)
  const helpersById = new Map(roll.map((tile) => [tile.session.id, tile.helpers]))

  const gridSessions = findSessions(visibleIds(state), standingSessions)
  const board = boarded(gridSessions.length)
  const phase = useBoardPhase(board)
  const placed = observatoryLayout(gridSessions.length, viewport, sidebarW)
  const placedBoard = boardLayout(viewport, sidebarW)
  const [openLane, setOpenLane] = useState<string | null>(null)
  const [sheet, setSheet] = useState(false)
  const narrow = !roomToFan(viewport, sidebarW) && standingSessions.length > 0

  useEffect(() => {
    if (narrow && roster) setSheet(false)
  }, [narrow, roster])

  const tight = narrowLayout(viewport, narrow && sheet)
  const terminalRect = narrow
    ? tight.body
    : atGrid
      ? board
        ? placedBoard.terminal
        : placed.terminal
      : solo
  const framed = narrow || atGrid
  const seats = useRef(new Map<string, Rect>())

  const standing: PlacedTile[] = gridSessions.map((session, index) => ({
    session,
    rect: atGrid ? (placed.sessions[index] ?? solo) : solo,
    delayMs: staggerDelay(index + 1),
    closing: false,
  }))

  // Seats are only worth recording while the tiles are the deck's own layer:
  // under the board the grid still has an opinion about where tiles would go,
  // but nobody is sitting there.
  const seating = tilesStanding(phase)

  useEffect(() => {
    if (!seating) return
    for (const tile of standing) seats.current.set(tile.session.id, tile.rect)
  })

  // A tile leaves from the seat it held, not from wherever the survivors moved
  // to. A session with no seat never stood as a tile at all: it joined under
  // the board and it leaves through the board, and drawing it here would flash
  // a tile that was never there. Until the deck has drawn a frame it knows no
  // seats, and takes the machine's word for who is leaving.
  const stood = (session: AgentSession) => seats.current.size === 0 || seats.current.has(session.id)

  const leavers: PlacedTile[] = tilesCanLeave(phase)
    ? findSessions(closingIds(state), standingSessions)
        .filter(stood)
        .map((session) => ({
          session,
          rect: seats.current.get(session.id) ?? solo,
          delayMs: 0,
          closing: true,
        }))
    : NO_TILES

  // Boarding holds the tiles at their last seats and plays them out under the
  // arriving board. Whoever just joined has no seat, and arrives as a card.
  const snapshot: PlacedTile[] = gridSessions
    .filter((session) => seats.current.has(session.id))
    .map((session) => ({
      session,
      rect: seats.current.get(session.id) ?? solo,
      delayMs: 0,
      closing: true,
    }))

  let tiles: PlacedTile[] = NO_TILES
  if (tilesLeaving(phase)) tiles = snapshot
  else if (seating) tiles = [...standing, ...leavers]

  const attention = attentionId(gridSessions)

  const transitionMs = state.kind === 'merging' ? MOTION.mergeMs : MOTION.fanMs

  return (
    <div style={rootStyle}>
      <div
        data-terminal-tile
        style={{
          ...positionStyle,
          transform: `translate(${terminalRect.x}px, ${terminalRect.y}px)`,
          width: terminalRect.w,
          height: terminalRect.h,
          transition: [
            `transform ${transitionMs}ms ${MOTION.easing}`,
            `width ${transitionMs}ms ${MOTION.easing}`,
            `height ${transitionMs}ms ${MOTION.easing}`,
          ].join(', '),
        }}
      >
        <Surface
          bare={!framed}
          style={
            {
              height: '100%',
              padding: framed ? GRID_PAD : SHELL_PAD,
              paddingTop: framed ? GRID_PAD : CHROME_TOP,
              '--zt-shell-pad': `${framed ? GRID_PAD : SHELL_PAD}px`,
              '--zt-shell-pad-top': `${framed ? GRID_PAD : CHROME_TOP}px`,
            } as CSSProperties
          }
        >
          {terminal}
        </Surface>
      </div>
      {narrow && (
        <CrewSheet
          sessions={standingSessions}
          helpers={helpersById}
          bar={tight.bar}
          sheet={tight.sheet}
          nowMs={nowMs}
          face={face}
          name={name}
          open={sheet}
          openId={openLane}
          onToggle={() => setSheet((was) => !was)}
          onClose={() => setSheet(false)}
          onOpen={setOpenLane}
        />
      )}
      {!narrow && (
        <CrewLayer
          phase={phase}
          tiles={tiles}
          sessions={gridSessions}
          helpers={helpersById}
          board={placedBoard.board}
          grid={atGrid}
          nowMs={nowMs}
          face={face}
          name={name}
          openId={openLane}
          sweeping={sweeping}
          attention={attention}
          onOpen={setOpenLane}
          onDismiss={onDismiss}
        />
      )}
    </div>
  )
}

function useAdvancedFrame(kind: DeckState['kind']): boolean {
  const [advancedKind, setAdvancedKind] = useState<DeckState['kind'] | null>(null)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setAdvancedKind(kind))
    return () => cancelAnimationFrame(frame)
  }, [kind])

  return advancedKind === kind
}

function findSessions(ids: string[], sessions: AgentSession[]): AgentSession[] {
  return ids
    .map((id) => sessions.find((session) => session.id === id))
    .filter((session): session is AgentSession => session !== undefined)
}

const NO_TILES: PlacedTile[] = []

const rootStyle: CSSProperties = { position: 'fixed', inset: 0, zIndex: 1 }

const positionStyle: CSSProperties = { position: 'absolute', top: 0, left: 0 }
