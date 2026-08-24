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
  // Matched without case, because typing "ops" when "Ops" is already there
  // means that folder rather than a second one wearing the same word. The
  // spelling it was first given is the one it keeps wearing.
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
  // Counted the way a person counts, so sprint 2 comes before sprint 10.
  const folders = [...byName.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  )
  return { folders, loose }
}

// Which chats need writing to fix a folder's name. A folder is only the name
// its chats wear, so renaming one means renaming each of them — and a blank
// name is refused, because emptying it is how a chat gets unfiled and a rename
// must never quietly disband the folder.
export function renamedFolder(chats: ChatSummary[], from: string, to: string): string[] {
  const wanted = to.trim()
  const old = from.trim().toLocaleLowerCase()
  if (wanted.length === 0 || wanted === from.trim()) return []
  return chats
    .filter((chat) => chat.folder.trim().toLocaleLowerCase() === old)
    .map((chat) => chat.id)
}
