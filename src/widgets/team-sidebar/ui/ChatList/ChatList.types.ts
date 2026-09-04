import type { ChatSummary } from '@/entities/conversation'

// What a chat is doing, for every chat doing anything: replying, held on a
// permission, or held on something it asked. An idle chat is simply absent.
type ChatLive = 'working' | 'asking' | 'question'

export type ChatListProps = {
  chats: ChatSummary[]
  openId: string | null
  nowMs: number
  live: Record<string, ChatLive>
  onOpen(id: string): void
  onStart(): void
  onRemove(id: string): void
  onRename(id: string, wanted: string): void
  // '' files it back out into the loose list.
  onFile(id: string, folder: string): void
  onFileMany(ids: string[], folder: string): void
}

export type RowKit = {
  openId: string | null
  nowMs: number
  live: Record<string, ChatLive>
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
