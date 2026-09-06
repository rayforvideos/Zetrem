import type { MessageDescriptor } from '@lingui/core'
export type SlideFocus = 'all' | 'talk' | 'crew' | 'calls' | 'hire' | 'library' | 'keys'

export type Slide = {
  key: string
  focus: SlideFocus
  title: MessageDescriptor
  body: MessageDescriptor
}
