import { describe, expect, it } from 'vitest'
import { unseenSince } from './unseen'

const note = (updatedAtMs: number) => ({
  id: `분석/${updatedAtMs}.md`,
  folder: '분석',
  title: String(updatedAtMs),
  lead: '',
  updatedAtMs,
})

describe('whether the vault holds something written since you last looked', () => {
  it('holds nothing new when nothing is filed at all', () => {
    expect(unseenSince([], 1_000)).toBe(false)
  })

  it('stays quiet for notes that were already there when you looked', () => {
    expect(unseenSince([note(400), note(1_000)], 1_000)).toBe(false)
  })

  it('speaks up as soon as one note is younger than that look', () => {
    expect(unseenSince([note(400), note(1_001)], 1_000)).toBe(true)
  })
})
