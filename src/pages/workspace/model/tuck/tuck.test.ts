import { describe, expect, it } from 'vitest'
import { SIDEBAR } from '@/shared/config/theme'
import { tuckedBy } from './tuck'

describe('tuckedBy: how far to slide the sidebar out of the way', () => {
  it('leaves it where it is while it is open', () => {
    expect(tuckedBy(true, 315, 343)).toBe(0)
  })

  it('slides it by what it actually measures, not by what it was asked to be', () => {
    expect(tuckedBy(false, 315, 343)).toBe(-(315 + SIDEBAR.gap))
  })

  it('takes the row gap with it, so a hidden sidebar leaves no dent', () => {
    expect(tuckedBy(false, 200, 200)).toBe(-228)
  })

  it('falls back to the asked width until the first measurement lands', () => {
    expect(tuckedBy(false, 0, 343)).toBe(-(343 + SIDEBAR.gap))
  })
})
