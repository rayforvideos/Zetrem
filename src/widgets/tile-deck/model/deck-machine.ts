export type DeckState =
  | { kind: 'solo' }
  | { kind: 'fanning'; ids: string[] }
  | { kind: 'fanned'; ids: string[]; closing: string[] }
  | { kind: 'merging'; ids: string[]; closing: string[] }

export type DeckEvent =
  | { type: 'launch'; ids: string[] }
  | { type: 'fanSettled' }
  | { type: 'openOne'; id: string }
  | { type: 'closeOne'; id: string }
  | { type: 'tileRetired'; id: string }
  | { type: 'mergeSettled' }

export const INITIAL_DECK: DeckState = { kind: 'solo' }

export function deckReducer(state: DeckState, event: DeckEvent): DeckState {
  switch (state.kind) {
    case 'solo':
      if (event.type === 'launch' && event.ids.length > 0) {
        return { kind: 'fanning', ids: event.ids }
      }
      return state

    case 'fanning':
      if (event.type === 'fanSettled') return { kind: 'fanned', ids: state.ids, closing: [] }
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
      return ids.length === 0 ? { kind: 'merging', ids, closing } : { kind: 'fanned', ids, closing }
    }

    case 'merging':
      if (event.type === 'mergeSettled') return INITIAL_DECK
      return state
  }
}

function without(ids: string[], id: string): string[] {
  return ids.filter((candidate) => candidate !== id)
}

export function visibleIds(state: DeckState): string[] {
  return state.kind === 'solo' ? [] : state.ids
}

export function closingIds(state: DeckState): string[] {
  return state.kind === 'fanned' || state.kind === 'merging' ? state.closing : []
}
