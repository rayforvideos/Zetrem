import { describe, expect, it } from 'vitest'
import { whenLabel } from './when'

const now = Date.parse('2026-08-14T21:00:00Z')

describe('whenLabel: the time that hangs on a list row', () => {
  it('says how long ago for anything recent', () => {
    expect(whenLabel(now - 5_000, now)).toBe('just now')
    expect(whenLabel(now - 5 * 60_000, now)).toBe('5m ago')
    expect(whenLabel(now - 3 * 3_600_000, now)).toBe('3h ago')
    expect(whenLabel(now - 2 * 86_400_000, now)).toBe('2d ago')
  })

  it('gives a date past a week, because 40d ago means nothing', () => {
    expect(whenLabel(Date.parse('2026-06-01T00:00:00Z'), now)).toMatch(/2026-06-0\d/)
  })

  it('holds up for a time written in the future', () => {
    expect(whenLabel(now + 100_000, now)).toBe('just now')
  })
})
