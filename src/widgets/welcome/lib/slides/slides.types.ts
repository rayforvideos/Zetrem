export type SlideFocus = 'all' | 'talk' | 'crew' | 'calls' | 'hire' | 'keys'

export type Slide = {
  key: string
  focus: SlideFocus
  title: string
  body: string
}
