import { describe, expect, it } from 'vitest'
import type { MemoryEntry } from '@/entities/agent-memory/model/note'
import { arrangedEntries, dayGap, kindsOf } from './memory-list'

function entry(id: string, kind: string, updated: number, name = id): MemoryEntry {
  return { id, name, description: '', kind, updated }
}

const ENTRIES: MemoryEntry[] = [
  entry('a.md', 'project', 200, 'beta'),
  entry('b.md', 'feedback', 300, 'alpha'),
  entry('c.md', 'project', 100, 'gamma'),
  entry('d.md', '', 50, 'delta'),
]

describe('arrangedEntries', () => {
  it('sorts every entry by last write, newest first', () => {
    const ids = arrangedEntries(ENTRIES, 'all', 'recent').map((one) => one.id)
    expect(ids).toEqual(['b.md', 'a.md', 'c.md', 'd.md'])
  })

  it('sorts by name when asked', () => {
    const names = arrangedEntries(ENTRIES, 'all', 'name').map((one) => one.name)
    expect(names).toEqual(['alpha', 'beta', 'delta', 'gamma'])
  })

  it('keeps only the picked kind', () => {
    const ids = arrangedEntries(ENTRIES, 'project', 'recent').map((one) => one.id)
    expect(ids).toEqual(['a.md', 'c.md'])
  })
})

describe('kindsOf', () => {
  it('answers the kinds present, in the fixed known order, unknown last', () => {
    const mixed = [
      entry('a.md', 'reference', 1),
      entry('b.md', 'feedback', 2),
      entry('c.md', 'zzz', 3),
      entry('d.md', 'feedback', 4),
      entry('e.md', '', 5),
    ]
    expect(kindsOf(mixed)).toEqual(['feedback', 'reference', 'zzz'])
  })

  it('answers nothing when only untyped entries exist', () => {
    expect(kindsOf([entry('a.md', '', 1)])).toEqual([])
  })
})

describe('dayGap', () => {
  // Calendar days, not 24-hour blocks: 23:59 to 00:01 is one day apart.
  const at = (day: string): number => new Date(day).getTime()

  it('answers zero within the same calendar day', () => {
    expect(dayGap(at('2026-09-01T00:10:00'), at('2026-09-01T23:50:00'))).toBe(0)
  })

  it('answers one across midnight even minutes apart', () => {
    expect(dayGap(at('2026-08-31T23:59:00'), at('2026-09-01T00:01:00'))).toBe(1)
  })

  it('counts whole days further back', () => {
    expect(dayGap(at('2026-08-25T12:00:00'), at('2026-09-01T12:00:00'))).toBe(7)
  })

  it('never answers negative for a write moments ahead of the clock', () => {
    expect(dayGap(at('2026-09-01T12:00:01'), at('2026-09-01T11:59:59'))).toBe(0)
  })
})
