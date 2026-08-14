/**
 * 셸 전이 (스펙 §2).
 * 플래그 두 개로 두면 isFanning && isMerging 이 표현 가능해진다 — 그래서 union 이다.
 *
 * `ids` 는 격자에 자리를 가진 타일, `closing` 은 자리를 내놓고 닫히는 중인 타일이다.
 * 닫는 순간 id 를 버리면 타일이 같은 커밋에 언마운트돼 닫힘 연출이 존재할 수 없다.
 * 종료 연출에 시작과 동등한 공을 들이려면(스펙 §2.3) 물러나는 타일도 상태에 있어야 한다.
 *
 * `closing` 은 닫힘이 시작될 수 있는 상태에만 있다. 갈라지는 중에는 닫힐 타일이 없다.
 */
export type DeckState =
  | { kind: 'solo' }
  | { kind: 'fanning'; ids: string[] }
  | { kind: 'fanned'; ids: string[]; closing: string[] }
  | { kind: 'merging'; ids: string[]; closing: string[] }

export type DeckEvent =
  | { type: 'launch'; ids: string[] }
  | { type: 'fanSettled' }
  /** 격자에 타일 하나를 더한다 — 서브에이전트의 탄생. solo 에서는 무시된다 */
  | { type: 'openOne'; id: string }
  | { type: 'closeOne'; id: string }
  /** 닫힘 연출이 끝났다 — 이제 언마운트해도 된다 */
  | { type: 'tileRetired'; id: string }
  | { type: 'mergeSettled' }

export const INITIAL_DECK: DeckState = { kind: 'solo' }

/** 표에 없는 (상태, 이벤트) 는 현재 상태를 그대로 돌려준다 */
export function deckReducer(state: DeckState, event: DeckEvent): DeckState {
  switch (state.kind) {
    case 'solo':
      if (event.type === 'launch' && event.ids.length > 0) {
        return { kind: 'fanning', ids: event.ids }
      }
      return state

    case 'fanning':
      if (event.type === 'fanSettled') return { kind: 'fanned', ids: state.ids, closing: [] }
      // 자식은 부모의 전환을 기다리지 않는다 — 갈라지는 격자에 바로 낀다
      if (event.type === 'openOne' && !state.ids.includes(event.id)) {
        return { kind: 'fanning', ids: [...state.ids, event.id] }
      }
      return state

    case 'fanned': {
      if (event.type === 'openOne') {
        if (state.ids.includes(event.id)) return state
        return { ...state, ids: [...state.ids, event.id] }
      }
      if (event.type === 'tileRetired') {
        if (!state.closing.includes(event.id)) return state
        return { ...state, closing: without(state.closing, event.id) }
      }
      if (event.type !== 'closeOne') return state
      if (!state.ids.includes(event.id)) return state
      const ids = without(state.ids, event.id)
      const closing = [...state.closing, event.id]
      // 마지막 타일이 닫히면 남은 한 장으로 수렴한다. 닫히는 타일은 그동안 계속 그려진다
      return ids.length === 0 ? { kind: 'merging', ids, closing } : { kind: 'fanned', ids, closing }
    }

    case 'merging':
      // 수렴이 끝나면 closing 도 함께 비운다 — 그 화면에 남을 타일은 없다.
      // 그래서 merging 중에는 tileRetired 를 따로 받지 않는다. 수렴 시간과 닫힘 시간이 같다
      if (event.type === 'mergeSettled') return INITIAL_DECK
      return state
  }
}

function without(ids: string[], id: string): string[] {
  return ids.filter((candidate) => candidate !== id)
}

/** 격자에 자리를 가진 타일 */
export function visibleIds(state: DeckState): string[] {
  return state.kind === 'solo' ? [] : state.ids
}

/** 자리를 내놓고 닫히는 중인 타일. 아직 그려야 한다 */
export function closingIds(state: DeckState): string[] {
  return state.kind === 'fanned' || state.kind === 'merging' ? state.closing : []
}
