import type { ChatSummary } from '@/entities/conversation'

export type ChatListProps = {
  chats: ChatSummary[]
  openId: string | null
  nowMs: number
  onOpen(id: string): void
  onStart(): void
  onRemove(id: string): void
  onRename(id: string, wanted: string): void
  // '' files it back out into the loose list.
  onFile(id: string, folder: string): void
}
