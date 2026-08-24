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
  // Every chat wearing a folder's name is written at once: renaming the folder,
  // or emptying it back into the loose list.
  onFileMany(ids: string[], folder: string): void
}
