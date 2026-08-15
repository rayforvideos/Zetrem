import { describe, expect, it } from 'vitest'
import { reachOf } from './reach'

describe('reachOf: how far along a stretch of time reads on a bar', () => {
  it('barely starts for something that took no time', () => {
    expect(reachOf(0)).toBe(4)
  })

  it('reaches further the longer it ran', () => {
    expect(reachOf(30_000)).toBeGreaterThan(reachOf(1000))
    expect(reachOf(1000)).toBeGreaterThan(reachOf(50))
  })

  it('gives the first seconds more of the bar than the last, so a short wait still shows', () => {
    expect(reachOf(1000) - reachOf(0)).toBeGreaterThan(reachOf(60_000) - reachOf(30_000))
  })

  it('stops at the end of the bar, so one long wait cannot overrun it', () => {
    expect(reachOf(60_000)).toBe(100)
    expect(reachOf(3_600_000)).toBe(100)
  })

  it('treats a nonsense span as no time at all', () => {
    expect(reachOf(-500)).toBe(4)
    expect(reachOf(Number.NaN)).toBe(4)
  })
})
