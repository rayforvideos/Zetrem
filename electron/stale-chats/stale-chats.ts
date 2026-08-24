import type { Dated } from './stale-chats.types'

export function staleChats(dated: Dated[], cap: number): string[] {
  const loose = dated.filter((one) => !one.filed)
  if (loose.length <= cap) return []
  return loose
    .sort((a, b) => b.at - a.at || a.path.localeCompare(b.path))
    .slice(cap)
    .map((one) => one.path)
}
