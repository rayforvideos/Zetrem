import { useCallback, useEffect, useReducer, useRef } from 'react'
import { MOTION } from '@/shared/config/motion/motion'
import { INITIAL_DECK, closingIds, deckReducer } from './deck-machine/deck-machine'
import type { DeckState } from './deck-machine/deck-machine.types'

type Deck = {
  state: DeckState
  launch(ids: string[]): void
  openOne(id: string): void
  closeOne(id: string): void
}

export function useDeck(): Deck {
  const [state, dispatch] = useReducer(deckReducer, INITIAL_DECK)

  useEffect(() => {
    if (state.kind === 'fanning') {
      const timer = setTimeout(() => dispatch({ type: 'fanSettled' }), MOTION.fanMs)
      return () => clearTimeout(timer)
    }
    if (state.kind === 'merging') {
      const timer = setTimeout(() => dispatch({ type: 'mergeSettled' }), MOTION.mergeMs)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [state.kind])

  const retiring = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    const closing = closingIds(state)
    for (const id of closing) {
      if (retiring.current.has(id)) continue
      retiring.current.set(
        id,
        setTimeout(() => {
          retiring.current.delete(id)
          dispatch({ type: 'tileRetired', id })
        }, MOTION.mergeMs),
      )
    }
    for (const [id, timer] of retiring.current) {
      if (closing.includes(id)) continue
      clearTimeout(timer)
      retiring.current.delete(id)
    }
  }, [state])

  useEffect(() => {
    const timers = retiring.current
    return () => {
      for (const timer of timers.values()) clearTimeout(timer)
      timers.clear()
    }
  }, [])

  const launch = useCallback((ids: string[]) => dispatch({ type: 'launch', ids }), [])
  const openOne = useCallback((id: string) => dispatch({ type: 'openOne', id }), [])
  const closeOne = useCallback((id: string) => dispatch({ type: 'closeOne', id }), [])

  return { state, launch, openOne, closeOne }
}
