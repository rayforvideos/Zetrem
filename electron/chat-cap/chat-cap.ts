// The cap bounds how many loose chats the list carries, and nothing more.
//
// A filed chat sits outside it, the same way the prune leaves it alone. Cutting
// the list to the newest sixty regardless of folder made filed chats disappear
// from the sidebar while their files stayed on disk — so filing, which is meant
// to mean keeping, quietly meant losing instead.
export function withinCap<T extends { folder: string }>(chats: T[], cap: number): T[] {
  let loose = 0
  return chats.filter((chat) => {
    if (chat.folder.trim().length > 0) return true
    loose += 1
    return loose <= cap
  })
}
