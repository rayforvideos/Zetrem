import type { ChatSummary } from '@/entities/conversation'

export const ROOMY = 12

export function matchChats(chats: ChatSummary[], query: string): ChatSummary[] {
  const wanted = query.trim().toLocaleLowerCase()
  if (wanted.length === 0) return chats
  return chats.filter((chat) => `${chat.title} ${chat.folder}`.toLocaleLowerCase().includes(wanted))
}
