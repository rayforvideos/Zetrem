import type { Dated } from './stale-chats.types'

export function staleChats(dated: Dated[], cap: number): string[] {
  if (dated.length <= cap) return []
  return [...dated]
    .sort((a, b) => b.at - a.at || a.path.localeCompare(b.path))
    .slice(cap)
    .map((one) => one.path)
}
