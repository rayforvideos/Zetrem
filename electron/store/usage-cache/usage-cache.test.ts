import { describe, expect, it } from 'vitest'
import { USAGE_KEEP_MS, readKept, stillWorthShowing } from './usage-cache'

describe('stillWorthShowing: whether a saved reading is worth putting up first', () => {
  it('shows a reading taken moments ago, since the windows it counts are hours long', () => {
    expect(stillWorthShowing({ report: 'x', atMs: 1000 }, 60_000)).toBe(true)
  })

  it('drops a reading old enough that its window may have rolled over', () => {
    expect(stillWorthShowing({ report: 'x', atMs: 0 }, USAGE_KEEP_MS)).toBe(false)
  })

  it('has nothing to show before anything has ever been read', () => {
    expect(stillWorthShowing(null, 1000)).toBe(false)
  })

  it('does not put up an empty reading, which would read as no limits at all', () => {
    expect(stillWorthShowing({ report: '   ', atMs: 1000 }, 2000)).toBe(false)
  })

  it('distrusts a reading stamped in the future, which means the clock moved', () => {
    expect(stillWorthShowing({ report: 'x', atMs: 9000 }, 1000)).toBe(false)
  })
})

describe('readKept: taking the saved reading back off disk', () => {
  it('reads back what was written', () => {
    expect(readKept('{"report":"5-hour 20%","atMs":42}')).toEqual({ report: '5-hour 20%', atMs: 42 })
  })

  it('returns nothing for a file that is not the shape it expects', () => {
    expect(readKept('{"report":5}')).toBeNull()
    expect(readKept('{"atMs":1}')).toBeNull()
  })

  it('returns nothing rather than throwing on a file that was cut off mid write', () => {
    expect(readKept('{"report":"5-h')).toBeNull()
  })
})
