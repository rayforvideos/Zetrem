import { describe, expect, it } from 'vitest'
import { GREETING_MS, greetingAt, greetingCount } from './greetings'

describe('greetingAt: the empty screen does not say the same thing every time', () => {
  it('comes round to a different line each time', () => {
    const seen = new Set(Array.from({ length: greetingCount() }, (_, i) => greetingAt(i)))
    expect(seen.size).toBe(greetingCount())
  })

  it('comes back to the first after a full turn', () => {
    expect(greetingAt(greetingCount())).toBe(greetingAt(0))
  })

  it('holds up for a negative tick, however the clock is counted', () => {
    expect(greetingAt(-1).length).toBeGreaterThan(0)
    expect(greetingAt(-greetingCount() - 3).length).toBeGreaterThan(0)
  })

  it('has no empty line', () => {
    for (let i = 0; i < greetingCount(); i += 1) {
      expect(greetingAt(i).trim().length, `${i}`).toBeGreaterThan(0)
    }
  })

  it('leaves long enough between changes to read one', () => {
    expect(GREETING_MS).toBeGreaterThanOrEqual(4000)
  })
})
