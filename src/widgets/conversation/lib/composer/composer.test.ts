import { describe, expect, it } from 'vitest'
import { beganComposing, endedComposing, newComposer, sent } from './composer'

describe('composer: knowing whether the box needs clearing once more after a composition', () => {
  it('owes a clear at the end of a composition that was sent mid-way', () => {
    const composer = newComposer()
    beganComposing(composer)
    sent(composer)
    expect(endedComposing(composer)).toBe(true)
  })

  it('owes nothing when there was no composition, as when typing in English', () => {
    const composer = newComposer()
    sent(composer)
    expect(endedComposing(composer)).toBe(false)
  })

  it('asks for nothing when a composition ended without a send', () => {
    const composer = newComposer()
    beganComposing(composer)
    expect(endedComposing(composer)).toBe(false)
  })

  it('pays the debt once, and does not clear twice for two ends', () => {
    const composer = newComposer()
    beganComposing(composer)
    sent(composer)
    expect(endedComposing(composer)).toBe(true)
    expect(endedComposing(composer)).toBe(false)
  })

  it('does not leak state across sends in a row', () => {
    const composer = newComposer()
    for (let round = 0; round < 3; round += 1) {
      beganComposing(composer)
      sent(composer)
      expect(endedComposing(composer), `${round}`).toBe(true)
    }
  })

  it('does not revive an old debt when a new composition starts', () => {
    const composer = newComposer()
    beganComposing(composer)
    sent(composer)
    endedComposing(composer)
    beganComposing(composer)
    expect(endedComposing(composer)).toBe(false)
  })
})
