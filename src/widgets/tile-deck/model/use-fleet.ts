import { useEffect } from 'react'
import type { AgentSession } from '@/entities/agent-session'
import { TILE_MIN_DWELL_MS } from '@/shared/config/motion/motion'
import { closingIds, visibleIds } from './deck-machine/deck-machine'
import type { DeckState } from './deck-machine/deck-machine.types'
import { roomToFan } from '../lib/grid/grid'
import type { Viewport } from '../lib/grid/grid.types'
import { arrived, orphaned, retired } from './fleet/fleet'

type Deck = {
  state: DeckState
  launch(ids: string[]): void
  openOne(id: string): void
  closeOne(id: string): void
}

export function useFleet(
  deck: Deck,
  children: AgentSession[],
  nowMs: number,
  viewport: Viewport,
  sidebarW: number,
): void {
  const { state, launch, openOne, closeOne } = deck

  const room = roomToFan(viewport, sidebarW)
  useEffect(() => {
    if (!room) return
    const placed = new Set([...visibleIds(state), ...closingIds(state)])
    const fresh = arrived(children, placed)
    if (fresh.length === 0) return
    if (state.kind === 'solo') launch(fresh)
    else for (const id of fresh) openOne(id)
  }, [children, state, room])

  useEffect(() => {
    const onScreen = new Set(visibleIds(state))
    for (const id of orphaned(children, onScreen)) closeOne(id)
    for (const id of retired(children, onScreen, nowMs, TILE_MIN_DWELL_MS)) closeOne(id)
  }, [children, state, nowMs])
}
