export const CHAT_CAP = 60

export function withinCap<T extends { folder: string }>(chats: T[], cap: number): T[] {
  let loose = 0
  return chats.filter((chat) => {
    if (chat.folder.trim().length > 0) return true
    loose += 1
    return loose <= cap
  })
}
