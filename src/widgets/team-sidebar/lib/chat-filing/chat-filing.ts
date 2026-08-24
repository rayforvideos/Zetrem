import type { ChatSummary } from '@/entities/conversation'
import type { Filing, Folder } from './chat-filing.types'

// A folder is not a thing of its own: it is the name some chats wear. So the
// list of folders is whatever names are in use, and a folder nobody files into
// simply stops existing — there is no empty folder to tidy up, rename, or
// explain.
//
// The loose chats stay loose and stay visible. Filing one chat must never make
// the rest look gone.
export function fileChats(chats: ChatSummary[]): Filing {
  const byName = new Map<string, ChatSummary[]>()
  const loose: ChatSummary[] = []
  for (const chat of chats) {
    const name = chat.folder.trim()
    if (name.length === 0) {
      loose.push(chat)
      continue
    }
    const held = byName.get(name)
    if (held) held.push(chat)
    else byName.set(name, [chat])
  }
  const folders: Folder[] = [...byName.entries()]
    .map(([name, held]) => ({ name, chats: held }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return { folders, loose }
}
