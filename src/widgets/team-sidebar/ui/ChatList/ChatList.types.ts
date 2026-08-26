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

// Everything a row needs and nothing it decides for itself. Rows are drawn from
// three places — loose, inside a folder, and inside a folder's day bands — and
// they all hand over the same set.
export type RowKit = {
  openId: string | null
  nowMs: number
  names: string[]
  onOpen(id: string): void
  onRemove(id: string): void
  onRename(id: string, wanted: string): void
  onFile(id: string, folder: string): void
  onCarry(draggedId: string, target: ChatSummary): void
  carried: ChatSummary | null
  onPickUp(chat: ChatSummary | null): void
  pairing: [string, string] | null
  onPaired(name: string | null): void
}
