import { describe, expect, it } from 'vitest'
import { armed } from './arming'

describe('armed: whether a decision can land on the ask shown right now', () => {
  it('is not armed the instant an ask appears', () => {
    expect(armed(1000, 1000)).toBe(false)
  })

  it('is not armed while still inside the grace window', () => {
    expect(armed(1000, 1299)).toBe(false)
  })

  it('becomes armed once the grace window has passed', () => {
    expect(armed(1000, 1300)).toBe(true)
    expect(armed(1000, 5000)).toBe(true)
  })

  it('treats a clock that moved backwards as still inside the window', () => {
    expect(armed(1000, 500)).toBe(false)
  })
})
