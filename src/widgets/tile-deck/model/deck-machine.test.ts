import { describe, expect, it } from 'vitest'
import { INITIAL_DECK, closingIds, deckReducer, visibleIds } from './deck-machine'
import type { DeckState } from './deck-machine'

const fanned: DeckState = { kind: 'fanned', ids: ['a', 'b', 'c'], closing: [] }

describe('deckReducer', () => {
  it('초기 상태는 solo 다', () => {
    expect(INITIAL_DECK.kind).toBe('solo')
  })

  it('solo 에서 launch 하면 fanning 으로 간다', () => {
    const next = deckReducer(INITIAL_DECK, { type: 'launch', ids: ['a', 'b'] })
    expect(next).toEqual({ kind: 'fanning', ids: ['a', 'b'] })
  })

  it('빈 목록으로 launch 하면 solo 에 머문다', () => {
    expect(deckReducer(INITIAL_DECK, { type: 'launch', ids: [] })).toBe(INITIAL_DECK)
  })

  it('fanning 이 끝나면 fanned 가 된다', () => {
    const fanning: DeckState = { kind: 'fanning', ids: ['a'] }
    expect(deckReducer(fanning, { type: 'fanSettled' })).toEqual({
      kind: 'fanned',
      ids: ['a'],
      closing: [],
    })
  })

  it('전환 중 launch 는 무시된다', () => {
    const fanning: DeckState = { kind: 'fanning', ids: ['a'] }
    expect(deckReducer(fanning, { type: 'launch', ids: ['x'] })).toBe(fanning)

    const merging: DeckState = { kind: 'merging', ids: [], closing: ['a'] }
    expect(deckReducer(merging, { type: 'launch', ids: ['x'] })).toBe(merging)
  })

  it('fanned 에서 launch 는 무시된다 — 돌아가는 판을 갈아엎지 않는다', () => {
    expect(deckReducer(fanned, { type: 'launch', ids: ['x'] })).toBe(fanned)
  })

  it('타일 하나를 닫으면 나머지가 남는다', () => {
    const next = deckReducer(fanned, { type: 'closeOne', id: 'b' })
    expect(next).toEqual({ kind: 'fanned', ids: ['a', 'c'], closing: ['b'] })
  })

  it('마지막 타일을 닫으면 merging 으로 간다', () => {
    const one: DeckState = { kind: 'fanned', ids: ['a'], closing: [] }
    expect(deckReducer(one, { type: 'closeOne', id: 'a' })).toEqual({
      kind: 'merging',
      ids: [],
      closing: ['a'],
    })
  })

  it('없는 id 를 닫아도 상태가 그대로다', () => {
    expect(deckReducer(fanned, { type: 'closeOne', id: 'zzz' })).toBe(fanned)
  })

  it('merging 이 끝나면 solo 로 돌아온다', () => {
    const merging: DeckState = { kind: 'merging', ids: [], closing: ['a'] }
    expect(deckReducer(merging, { type: 'mergeSettled' }).kind).toBe('solo')
  })

  it('표에 없는 (상태, 이벤트) 는 같은 참조를 돌려준다', () => {
    expect(deckReducer(INITIAL_DECK, { type: 'fanSettled' })).toBe(INITIAL_DECK)
    expect(deckReducer(INITIAL_DECK, { type: 'closeOne', id: 'a' })).toBe(INITIAL_DECK)
    expect(deckReducer(INITIAL_DECK, { type: 'tileRetired', id: 'a' })).toBe(INITIAL_DECK)
    expect(deckReducer(fanned, { type: 'mergeSettled' })).toBe(fanned)
    const fanning: DeckState = { kind: 'fanning', ids: ['a'] }
    expect(deckReducer(fanning, { type: 'tileRetired', id: 'a' })).toBe(fanning)
  })

  it('한 판을 처음부터 끝까지 돌린다', () => {
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

describe('닫히는 타일의 수명', () => {
  it('닫은 타일은 자리를 잃지만 화면에서는 살아 있다', () => {
    const next = deckReducer(fanned, { type: 'closeOne', id: 'b' })
    expect(visibleIds(next)).toEqual(['a', 'c'])
    expect(closingIds(next)).toEqual(['b'])
  })

  it('연출이 끝나면 물러난다 — 그때 언마운트된다', () => {
    let state = deckReducer(fanned, { type: 'closeOne', id: 'b' })
    state = deckReducer(state, { type: 'tileRetired', id: 'b' })
    expect(closingIds(state)).toEqual([])
    expect(visibleIds(state)).toEqual(['a', 'c'])
  })

  it('여러 타일이 겹쳐 닫혀도 각자 물러난다', () => {
    let state = deckReducer(fanned, { type: 'closeOne', id: 'a' })
    state = deckReducer(state, { type: 'closeOne', id: 'c' })
    expect(closingIds(state)).toEqual(['a', 'c'])
    state = deckReducer(state, { type: 'tileRetired', id: 'a' })
    expect(closingIds(state)).toEqual(['c'])
    expect(visibleIds(state)).toEqual(['b'])
  })

  it('물러나지 않은 id 로 tileRetired 가 와도 상태가 그대로다', () => {
    const closing = deckReducer(fanned, { type: 'closeOne', id: 'b' })
    expect(deckReducer(closing, { type: 'tileRetired', id: 'zzz' })).toBe(closing)
  })

  it('마지막 타일은 merging 내내 그려진다 — 400ms 가 빈 화면을 애니메이션하지 않는다', () => {
    const one: DeckState = { kind: 'fanned', ids: ['a'], closing: [] }
    const merging = deckReducer(one, { type: 'closeOne', id: 'a' })
    expect(merging.kind).toBe('merging')
    expect(closingIds(merging)).toEqual(['a'])
    expect(closingIds(deckReducer(merging, { type: 'mergeSettled' }))).toEqual([])
  })
})

describe('visibleIds', () => {
  it('solo 에서는 비어 있다', () => {
    expect(visibleIds(INITIAL_DECK)).toEqual([])
  })

  it('전환 중에도 타일 목록을 낸다 — 그려야 움직인다', () => {
    expect(visibleIds({ kind: 'fanning', ids: ['a'] })).toEqual(['a'])
    expect(visibleIds(fanned)).toEqual(['a', 'b', 'c'])
  })
})

describe('closingIds', () => {
  it('닫는 중인 타일이 없으면 비어 있다', () => {
    expect(closingIds(INITIAL_DECK)).toEqual([])
    expect(closingIds({ kind: 'fanning', ids: ['a'] })).toEqual([])
    expect(closingIds(fanned)).toEqual([])
  })
})

describe('deckReducer — openOne (서브에이전트 타일)', () => {
  it('펼쳐진 격자에 타일 하나가 늘어난다', () => {
    const fanned: DeckState = { kind: 'fanned', ids: ['a'], closing: [] }
    const next = deckReducer(fanned, { type: 'openOne', id: 'a-c-t1' })
    expect(next).toEqual({ kind: 'fanned', ids: ['a', 'a-c-t1'], closing: [] })
  })

  it('갈라지는 중에도 늘어난다 — 자식은 부모의 전환을 기다리지 않는다', () => {
    const fanning: DeckState = { kind: 'fanning', ids: ['a'] }
    const next = deckReducer(fanning, { type: 'openOne', id: 'a-c-t1' })
    expect(next).toEqual({ kind: 'fanning', ids: ['a', 'a-c-t1'] })
  })

  it('이미 있는 id 는 같은 참조로 되돌린다', () => {
    const fanned: DeckState = { kind: 'fanned', ids: ['a'], closing: [] }
    expect(deckReducer(fanned, { type: 'openOne', id: 'a' })).toBe(fanned)
  })

  it('solo 에서는 무시한다 — 부모 없는 자식은 없다', () => {
    const solo: DeckState = { kind: 'solo' }
    expect(deckReducer(solo, { type: 'openOne', id: 'x' })).toBe(solo)
  })
})
