import type { MemoryEntry } from '@/entities/agent-memory/model/note'
import type { MemoryKindPick, MemorySort } from './memory-list.types'

// The chips list kinds in this order; anything the agent invents lands after.
const KNOWN_KINDS = ['feedback', 'project', 'user', 'reference']

export function arrangedEntries(
  entries: MemoryEntry[],
  kind: MemoryKindPick,
  sort: MemorySort,
): MemoryEntry[] {
  const picked = kind === 'all' ? entries : entries.filter((one) => one.kind === kind)
  return [...picked].sort((a, b) =>
    sort === 'recent' ? b.updated - a.updated : a.name.localeCompare(b.name),
  )
}

export function kindsOf(entries: MemoryEntry[]): string[] {
  const present = new Set(entries.map((one) => one.kind).filter((one) => one.length > 0))
  const known = KNOWN_KINDS.filter((one) => present.has(one))
  const unknown = [...present].filter((one) => !KNOWN_KINDS.includes(one)).sort()
  return [...known, ...unknown]
}

// Calendar days between a write and now, in local time; a clock slightly
// behind the file's mtime still reads as today.
export function dayGap(updated: number, now: number): number {
  const midnight = (at: number): number => new Date(at).setHours(0, 0, 0, 0)
  const gap = Math.round((midnight(now) - midnight(updated)) / 86_400_000)
  return Math.max(gap, 0)
}
