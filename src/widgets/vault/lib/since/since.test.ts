import { describe, expect, it } from 'vitest'
import { sinceOf } from './since'

const NOW = 1_700_000_000_000

describe('sinceOf', () => {
  it('says just now inside a minute, and never counts the future', () => {
    expect(sinceOf(NOW - 30_000, NOW)).toBe('just now')
    expect(sinceOf(NOW + 60_000, NOW)).toBe('just now')
  })

  it('counts minutes, hours and days', () => {
    expect(sinceOf(NOW - 3 * 60_000, NOW)).toBe('3m ago')
    expect(sinceOf(NOW - 5 * 3_600_000, NOW)).toBe('5h ago')
    expect(sinceOf(NOW - 2 * 86_400_000, NOW)).toBe('2d ago')
  })

  it('falls back to a short date after a week', () => {
    const then = NOW - 30 * 86_400_000
    expect(sinceOf(then, NOW)).toBe(new Date(then).toLocaleDateString())
  })
})
