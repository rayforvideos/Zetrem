import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { AgentSession } from '@/entities/agent-session'
import { Surface } from '@/entities/surface'
import { MOTION, staggerDelay } from '@/shared/config/motion/motion'
import { CHROME_TOP, GRID_PAD, SHELL_PAD } from '@/shared/config/theme'
import { attentionId } from '../../lib/attention/attention'
import { observatoryLayout, soloRect } from '../../lib/grid/grid'
import type { Rect, Viewport } from '../../lib/grid/grid.types'
import type { DeckState } from '../../model/deck-machine/deck-machine.types'
import { closingIds, visibleIds } from '../../model/deck-machine/deck-machine'
import { AgentTile } from '../AgentTile/AgentTile'

type TileDeckProps = {
  state: DeckState
  sessions: AgentSession[]
  viewport: Viewport
  nowMs: number
  sidebarW?: number
  terminal: ReactNode
  onDismiss?: (id: string) => void
}

type PlacedTile = {
  session: AgentSession
  rect: Rect
  delayMs: number
  closing: boolean
}

export function TileDeck({
  state,
  sessions,
  viewport,
  nowMs,
  sidebarW = 0,
  terminal,
  onDismiss,
}: TileDeckProps) {
  const solo = soloRect(viewport)
  const advanced = useAdvancedFrame(state.kind)
  const sweeping = state.kind === 'fanning' || state.kind === 'merging'

  const atGrid = state.kind === 'fanned' || (state.kind === 'fanning' && advanced)

  const gridSessions = findSessions(visibleIds(state), sessions)
  const placed = observatoryLayout(gridSessions.length, viewport, sidebarW)
  const terminalRect = atGrid ? placed.terminal : solo
  const seats = useRef(new Map<string, Rect>())

  const standing: PlacedTile[] = gridSessions.map((session, index) => ({
    session,
    rect: atGrid ? (placed.sessions[index] ?? solo) : solo,
    delayMs: staggerDelay(index + 1),
    closing: false,
  }))

  useEffect(() => {
    for (const tile of standing) seats.current.set(tile.session.id, tile.rect)
  })

  const tiles: PlacedTile[] = [
    ...standing,
    ...findSessions(closingIds(state), sessions).map((session) => ({
      session,
      rect: seats.current.get(session.id) ?? solo,
      delayMs: 0,
      closing: true,
    })),
  ]

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
          bare={!atGrid}
          style={
            {
              height: '100%',
              padding: atGrid ? GRID_PAD : SHELL_PAD,
              paddingTop: atGrid ? GRID_PAD : CHROME_TOP,
              '--zt-shell-pad': `${atGrid ? GRID_PAD : SHELL_PAD}px`,
              '--zt-shell-pad-top': `${atGrid ? GRID_PAD : CHROME_TOP}px`,
            } as CSSProperties
          }
        >
          {terminal}
        </Surface>
      </div>
      {tiles.map((tile) => (
        <AgentTile
          key={tile.session.id}
          session={tile.session}
          rect={tile.rect}
          delayMs={tile.delayMs}
          nowMs={nowMs}
          sweeping={sweeping}
          closing={tile.closing}
          attention={!tile.closing && tile.session.id === attention}
          onDismiss={onDismiss === undefined ? undefined : () => onDismiss(tile.session.id)}
        />
      ))}
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

const rootStyle: CSSProperties = { position: 'fixed', inset: 0, zIndex: 1 }

const positionStyle: CSSProperties = { position: 'absolute', top: 0, left: 0 }
