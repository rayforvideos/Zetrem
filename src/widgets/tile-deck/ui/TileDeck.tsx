import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { AgentSession } from '@/entities/agent-session'
import { Surface } from '@/entities/surface'
import { MOTION, staggerDelay } from '@/shared/config/motion'
import { CHROME_TOP } from '@/shared/config/theme'
import { attentionId } from '../lib/attention'
import { observatoryLayout, soloRect } from '../lib/grid'
import type { Rect, Viewport } from '../lib/grid'
import type { DeckState } from '../model/deck-machine'
import { closingIds, visibleIds } from '../model/deck-machine'
import { AgentTile } from './AgentTile'

type TileDeckProps = {
  state: DeckState
  sessions: AgentSession[]
  viewport: Viewport
  nowMs: number
  terminal: ReactNode
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
  terminal,
}: TileDeckProps) {
  const solo = soloRect(viewport)
  const advanced = useAdvancedFrame(state.kind)
  const sweeping = state.kind === 'fanning' || state.kind === 'merging'

  const atGrid = state.kind === 'fanned' || (state.kind === 'fanning' && advanced)

  const gridSessions = findSessions(visibleIds(state), sessions)
  const placed = observatoryLayout(gridSessions.length, viewport)
  const terminalRect = atGrid ? placed.terminal : solo
  const tiles: PlacedTile[] = [
    ...gridSessions.map((session, index) => ({
      session,
      rect: atGrid ? (placed.sessions[index] ?? solo) : solo,
      delayMs: staggerDelay(index + 1),
      closing: false,
    })),
    ...findSessions(closingIds(state), sessions).map((session) => ({
      session,
      rect: solo,
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
          style={{
            height: '100%',
            padding: atGrid ? 20 : 28,
            paddingTop: atGrid ? 20 : CHROME_TOP,
          }}
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
