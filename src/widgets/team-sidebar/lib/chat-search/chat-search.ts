import type { ChatSummary } from '@/entities/conversation'

// Where folder navigation stops working. People re-find their own things by
// walking a hierarchy far more than by searching, but only while each folder
// stays small — past about a dozen items the walk stops paying and they fall
// back to looking. So a folder this size brings the days back, and the field
// above the list is the way out when even that is not enough.
export const ROOMY = 12

// The folder name counts as part of a chat's name here: it is what the person
// chose to call that work, so typing it should reach the chats inside, the way
// walking into the folder would.
export function matchChats(chats: ChatSummary[], query: string): ChatSummary[] {
  const wanted = query.trim().toLocaleLowerCase()
  if (wanted.length === 0) return chats
  return chats.filter((chat) => `${chat.title} ${chat.folder}`.toLocaleLowerCase().includes(wanted))
}
