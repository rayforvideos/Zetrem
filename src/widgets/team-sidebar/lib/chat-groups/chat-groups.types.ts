import type { MessageDescriptor } from '@lingui/core'
import type { ChatSummary } from '@/entities/conversation'

export type ChatGroup = {
  label: MessageDescriptor
  chats: ChatSummary[]
}
