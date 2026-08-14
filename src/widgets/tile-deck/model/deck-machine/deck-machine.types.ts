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
