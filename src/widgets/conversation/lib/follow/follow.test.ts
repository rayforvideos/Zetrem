import { describe, expect, it } from 'vitest'
import { shouldFollow } from './follow'

describe('shouldFollow: whether a new turn drags the view down with it', () => {
  it('lands at the bottom when a chat is first opened', () => {
    expect(shouldFollow(0, 40, false)).toBe(true)
  })

  it('follows a new turn while the reader is already at the bottom', () => {
    expect(shouldFollow(9, 10, true)).toBe(true)
  })

  it('leaves the reader alone when they have scrolled up to read', () => {
    expect(shouldFollow(9, 10, false)).toBe(false)
  })

  it('lands at the bottom when the list is swapped for a shorter one', () => {
    expect(shouldFollow(40, 3, false)).toBe(true)
  })

  it('has nothing to do with an empty chat', () => {
    expect(shouldFollow(0, 0, true)).toBe(false)
  })
})
