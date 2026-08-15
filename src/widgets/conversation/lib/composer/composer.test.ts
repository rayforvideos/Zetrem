import { describe, expect, it } from 'vitest'
import { beganComposing, endedComposing, maySendNow, newComposer, sent } from './composer'

describe('the composer never sends a half finished syllable', () => {
  it('sends at once when nothing is being composed', () => {
    expect(maySendNow(newComposer())).toBe(true)
  })

  it('holds the send while a syllable is still being built', () => {
    const keying = newComposer()
    beganComposing(keying)
    expect(maySendNow(keying)).toBe(false)
  })

  it('sends the moment the syllable is finished, so one press is enough', () => {
    const keying = newComposer()
    beganComposing(keying)
    maySendNow(keying)
    expect(endedComposing(keying)).toBe(true)
  })

  it('does not send on a composition nobody asked to send', () => {
    const keying = newComposer()
    beganComposing(keying)
    expect(endedComposing(keying)).toBe(false)
  })

  it('owes only one send, however many syllables follow', () => {
    const keying = newComposer()
    beganComposing(keying)
    maySendNow(keying)
    expect(endedComposing(keying)).toBe(true)
    beganComposing(keying)
    expect(endedComposing(keying)).toBe(false)
  })

  it('forgets what it owed once the send went through another way', () => {
    const keying = newComposer()
    beganComposing(keying)
    maySendNow(keying)
    sent(keying)
    expect(endedComposing(keying)).toBe(false)
  })

  it('sends every time once composing is over', () => {
    const keying = newComposer()
    beganComposing(keying)
    endedComposing(keying)
    expect(maySendNow(keying)).toBe(true)
    expect(maySendNow(keying)).toBe(true)
  })
})
