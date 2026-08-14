import { describe, expect, it } from 'vitest'
import { INITIAL_DECK, closingIds, deckReducer, visibleIds } from './deck-machine'
import type { DeckState } from './deck-machine.types'

const fanned: DeckState = { kind: 'fanned', ids: ['a', 'b', 'c'], closing: [] }

describe('deckReducer', () => {
  it('starts alone', () => {
    expect(INITIAL_DECK.kind).toBe('solo')
  })

  it('goes to fanning when a launch comes in alone', () => {
    const next = deckReducer(INITIAL_DECK, { type: 'launch', ids: ['a', 'b'] })
    expect(next).toEqual({ kind: 'fanning', ids: ['a', 'b'] })
  })

  it('stays alone when the launch has no ids', () => {
    expect(deckReducer(INITIAL_DECK, { type: 'launch', ids: [] })).toBe(INITIAL_DECK)
  })

  it('settles into fanned once the fan is done', () => {
    const fanning: DeckState = { kind: 'fanning', ids: ['a'] }
    expect(deckReducer(fanning, { type: 'fanSettled' })).toEqual({
      kind: 'fanned',
      ids: ['a'],
      closing: [],
    })
  })

  it('ignores a launch during a transition', () => {
    const fanning: DeckState = { kind: 'fanning', ids: ['a'] }
    expect(deckReducer(fanning, { type: 'launch', ids: ['x'] })).toBe(fanning)

    const merging: DeckState = { kind: 'merging', ids: [], closing: ['a'] }
    expect(deckReducer(merging, { type: 'launch', ids: ['x'] })).toBe(merging)
  })

  it('ignores a launch when already fanned, so a running deck is not torn down', () => {
    expect(deckReducer(fanned, { type: 'launch', ids: ['x'] })).toBe(fanned)
  })

  it('keeps the rest when one tile closes', () => {
    const next = deckReducer(fanned, { type: 'closeOne', id: 'b' })
    expect(next).toEqual({ kind: 'fanned', ids: ['a', 'c'], closing: ['b'] })
  })

  it('goes to merging when the last tile closes', () => {
    const one: DeckState = { kind: 'fanned', ids: ['a'], closing: [] }
    expect(deckReducer(one, { type: 'closeOne', id: 'a' })).toEqual({
      kind: 'merging',
      ids: [],
      closing: ['a'],
    })
  })

  it('changes nothing when closing an id it does not have', () => {
    expect(deckReducer(fanned, { type: 'closeOne', id: 'zzz' })).toBe(fanned)
  })

  it('comes back to alone once the merge is done', () => {
    const merging: DeckState = { kind: 'merging', ids: [], closing: ['a'] }
    expect(deckReducer(merging, { type: 'mergeSettled' }).kind).toBe('solo')
  })

  it('returns the same state object for a pair the table does not cover', () => {
    expect(deckReducer(INITIAL_DECK, { type: 'fanSettled' })).toBe(INITIAL_DECK)
    expect(deckReducer(INITIAL_DECK, { type: 'closeOne', id: 'a' })).toBe(INITIAL_DECK)
    expect(deckReducer(INITIAL_DECK, { type: 'tileRetired', id: 'a' })).toBe(INITIAL_DECK)
    expect(deckReducer(fanned, { type: 'mergeSettled' })).toBe(fanned)
    const fanning: DeckState = { kind: 'fanning', ids: ['a'] }
    expect(deckReducer(fanning, { type: 'tileRetired', id: 'a' })).toBe(fanning)
  })

  it('runs a whole deck from open to close', () => {
    let state = deckReducer(INITIAL_DECK, { type: 'launch', ids: ['a', 'b'] })
    state = deckReducer(state, { type: 'fanSettled' })
    state = deckReducer(state, { type: 'closeOne', id: 'a' })
    state = deckReducer(state, { type: 'tileRetired', id: 'a' })
    state = deckReducer(state, { type: 'closeOne', id: 'b' })
    expect(state.kind).toBe('merging')
    state = deckReducer(state, { type: 'mergeSettled' })
    expect(state.kind).toBe('solo')
  })
})

describe('how long a closing tile lives', () => {
  it('loses its place but stays on screen', () => {
    const next = deckReducer(fanned, { type: 'closeOne', id: 'b' })
    expect(visibleIds(next)).toEqual(['a', 'c'])
    expect(closingIds(next)).toEqual(['b'])
  })

  it('retires when the motion ends, and only then unmounts', () => {
    let state = deckReducer(fanned, { type: 'closeOne', id: 'b' })
    state = deckReducer(state, { type: 'tileRetired', id: 'b' })
    expect(closingIds(state)).toEqual([])
    expect(visibleIds(state)).toEqual(['a', 'c'])
  })

  it('retires each tile on its own when several close at once', () => {
    let state = deckReducer(fanned, { type: 'closeOne', id: 'a' })
    state = deckReducer(state, { type: 'closeOne', id: 'c' })
    expect(closingIds(state)).toEqual(['a', 'c'])
    state = deckReducer(state, { type: 'tileRetired', id: 'a' })
    expect(closingIds(state)).toEqual(['c'])
    expect(visibleIds(state)).toEqual(['b'])
  })

  it('changes nothing when told a tile retired that never left', () => {
    const closing = deckReducer(fanned, { type: 'closeOne', id: 'b' })
    expect(deckReducer(closing, { type: 'tileRetired', id: 'zzz' })).toBe(closing)
  })

  it('keeps the last tile drawn through the merge, so the motion is not over nothing', () => {
    const one: DeckState = { kind: 'fanned', ids: ['a'], closing: [] }
    const merging = deckReducer(one, { type: 'closeOne', id: 'a' })
    expect(merging.kind).toBe('merging')
    expect(closingIds(merging)).toEqual(['a'])
    expect(closingIds(deckReducer(merging, { type: 'mergeSettled' }))).toEqual([])
  })
})

describe('visibleIds', () => {
  it('is empty when alone', () => {
    expect(visibleIds(INITIAL_DECK)).toEqual([])
  })

  it('lists tiles during a transition, because they have to be drawn to move', () => {
    expect(visibleIds({ kind: 'fanning', ids: ['a'] })).toEqual(['a'])
    expect(visibleIds(fanned)).toEqual(['a', 'b', 'c'])
  })
})

describe('closingIds', () => {
  it('is empty when nothing is closing', () => {
    expect(closingIds(INITIAL_DECK)).toEqual([])
    expect(closingIds({ kind: 'fanning', ids: ['a'] })).toEqual([])
    expect(closingIds(fanned)).toEqual([])
  })
})

describe('deckReducer: openOne, one subagent tile at a time', () => {
  it('adds a tile to a grid that is already open', () => {
    const fanned: DeckState = { kind: 'fanned', ids: ['a'], closing: [] }
    const next = deckReducer(fanned, { type: 'openOne', id: 'a-c-t1' })
    expect(next).toEqual({ kind: 'fanned', ids: ['a', 'a-c-t1'], closing: [] })
  })

  it('adds one mid-fan, because a child does not wait for its parent', () => {
    const fanning: DeckState = { kind: 'fanning', ids: ['a'] }
    const next = deckReducer(fanning, { type: 'openOne', id: 'a-c-t1' })
    expect(next).toEqual({ kind: 'fanning', ids: ['a', 'a-c-t1'] })
  })

  it('returns the same state for an id it already has', () => {
    const fanned: DeckState = { kind: 'fanned', ids: ['a'], closing: [] }
    expect(deckReducer(fanned, { type: 'openOne', id: 'a' })).toBe(fanned)
  })

  it('ignores it while alone, since there is no child without a parent', () => {
    const solo: DeckState = { kind: 'solo' }
    expect(deckReducer(solo, { type: 'openOne', id: 'x' })).toBe(solo)
  })
})
