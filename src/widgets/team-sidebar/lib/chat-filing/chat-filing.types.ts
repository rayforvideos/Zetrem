import type { ChatSummary } from '@/entities/conversation'

export type Folder = { name: string; chats: ChatSummary[] }

export type Filing = { folders: Folder[]; loose: ChatSummary[] }
