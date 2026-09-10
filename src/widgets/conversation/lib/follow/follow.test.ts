import { describe, expect, it } from 'vitest'
import { shouldFollow, swapped } from './follow'

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

  it('lands at the bottom when the list is swapped for a longer one, too', () => {
    // Coming back to a chat with more turns than the one left behind: the
    // reader had scrolled up in the old chat, but that says nothing about
    // where they want to be in this one.
    expect(shouldFollow(40, 60, false, true)).toBe(true)
  })

  it('still leaves a reader alone when the same chat only grew', () => {
    expect(shouldFollow(40, 60, false, false)).toBe(false)
  })

  it('has nothing to do with an empty chat', () => {
    expect(shouldFollow(0, 0, true)).toBe(false)
    expect(shouldFollow(0, 0, true, true)).toBe(false)
  })
})

describe('swapped: whether the turns on screen belong to a different chat', () => {
  it('is a swap when the first turn is no longer the same one', () => {
    expect(swapped('a-1', 'b-1')).toBe(true)
  })

  it('is not a swap when the first turn stayed, however many came after it', () => {
    expect(swapped('a-1', 'a-1')).toBe(false)
  })

  it('is not a swap when there was nothing on screen before', () => {
    expect(swapped(null, 'b-1')).toBe(false)
  })

  it('is not a swap when the screen is going empty', () => {
    expect(swapped('a-1', null)).toBe(false)
    expect(swapped(null, null)).toBe(false)
  })
})
