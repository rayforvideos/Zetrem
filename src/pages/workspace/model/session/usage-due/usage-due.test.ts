import { describe, expect, it } from 'vitest'
import { USAGE_FLOOR_MS, USAGE_FRESH_MS, dueForUsage } from './usage-due'

describe('dueForUsage: when to ask the CLI what is left', () => {
  it('asks when nothing has ever been read', () => {
    expect(dueForUsage(null, 10_000, 'tick')).toBe(true)
    expect(dueForUsage(null, 10_000, 'turn')).toBe(true)
  })

  it('leaves a fresh reading alone on a plain tick', () => {
    const now = 1_000_000
    expect(dueForUsage(now - USAGE_FRESH_MS + 1000, now, 'tick')).toBe(false)
    expect(dueForUsage(now - USAGE_FRESH_MS, now, 'tick')).toBe(true)
  })

  it('asks again right after a turn, since that is when the numbers move', () => {
    const now = 1_000_000
    expect(dueForUsage(now - USAGE_FLOOR_MS, now, 'turn')).toBe(true)
    expect(dueForUsage(now - 5_000, now, 'turn')).toBe(false)
  })

  it('holds still if the clock walks backwards', () => {
    expect(dueForUsage(2_000_000, 1_000_000, 'tick')).toBe(false)
  })
})

describe('dueForUsage: an account change', () => {
  it('asks at once, however fresh the reading on screen is', () => {
    const now = 1_000_000
    expect(dueForUsage(now, now, 'account')).toBe(true)
    expect(dueForUsage(now - 1000, now, 'account')).toBe(true)
  })

  it('asks even if the clock walked backwards, since the numbers are not ours', () => {
    expect(dueForUsage(2_000_000, 1_000_000, 'account')).toBe(true)
  })
})
