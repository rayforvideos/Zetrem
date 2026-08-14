import type { ChatSummary } from '@/entities/conversation'

export type ChatGroup = {
  label: string
  chats: ChatSummary[]
}
