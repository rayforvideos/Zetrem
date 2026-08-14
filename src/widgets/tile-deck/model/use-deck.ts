import { useCallback, useEffect, useReducer, useRef } from 'react'
import { MOTION } from '@/shared/config/motion'
import { INITIAL_DECK, closingIds, deckReducer } from './deck-machine'
import type { DeckState } from './deck-machine'

type Deck = {
  state: DeckState
  launch(ids: string[]): void
  /** 격자에 타일 하나를 더한다 — 서브에이전트의 탄생 */
  openOne(id: string): void
  closeOne(id: string): void
}

/**
 * 전환이 끝나는 시점을 타이머로 알린다.
 * 전이를 일으키는 것은 언제나 reducer 이고, 훅은 이름 붙인 의도 둘만 밖으로 낸다.
 */
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

  // 닫히는 타일은 각자의 시계를 갖는다. 하나가 더 닫혀도 앞서 닫히던 타일의 시계는 흔들리지 않는다
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
    // mergeSettled 처럼 closing 을 통째로 비우는 경로가 있으므로 남은 시계를 거둔다
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
