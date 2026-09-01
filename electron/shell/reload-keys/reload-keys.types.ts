export type ReloadKind = 'plain' | 'hard'

// The slice of Electron's before-input-event payload the decision reads.
export type StrokeAsk = {
  type: string
  key: string
  control: boolean
  shift: boolean
  alt: boolean
  meta: boolean
}
