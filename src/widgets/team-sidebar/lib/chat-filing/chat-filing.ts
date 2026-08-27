import type { ChatSummary } from '@/entities/conversation'
import type { Filing, Folder } from './chat-filing.types'

export function fileChats(chats: ChatSummary[]): Filing {
  const byName = new Map<string, Folder>()
  const loose: ChatSummary[] = []
  for (const chat of chats) {
    const name = chat.folder.trim()
    if (name.length === 0) {
      loose.push(chat)
      continue
    }
    const key = name.toLocaleLowerCase()
    const held = byName.get(key)
    if (held) held.chats.push(chat)
    else byName.set(key, { name, chats: [chat] })
  }
  const folders = [...byName.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  )
  return { folders, loose }
}

export function chatsInFolder(chats: ChatSummary[], name: string): ChatSummary[] {
  const key = name.trim().toLocaleLowerCase()
  return chats.filter((chat) => chat.folder.trim().toLocaleLowerCase() === key)
}

// A blank name is refused: emptying a chat's folder is how it gets unfiled, and a
// rename must not disband the folder.
export function renamedFolder(chats: ChatSummary[], from: string, to: string): string[] {
  const wanted = to.trim()
  const old = from.trim().toLocaleLowerCase()
  if (wanted.length === 0 || wanted === from.trim()) return []
  return chats
    .filter((chat) => chat.folder.trim().toLocaleLowerCase() === old)
    .map((chat) => chat.id)
}
