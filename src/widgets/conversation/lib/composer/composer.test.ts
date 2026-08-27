import { describe, expect, it } from 'vitest'
import {
  beganComposing,
  endedComposing,
  maySendNow,
  newComposer,
  sendKey,
  sent,
  takeOwed,
} from './composer'

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
    expect(takeOwed(keying)).toBe(true)
    beganComposing(keying)
    expect(endedComposing(keying)).toBe(false)
  })

  it('drops the owed send when the key came back and sent it first', () => {
    // A Korean IME delivers one Enter twice: once to finish the syllable, then
    // again as the key itself. The first one's scheduled send must not fire.
    const keying = newComposer()
    beganComposing(keying)
    maySendNow(keying)
    expect(endedComposing(keying)).toBe(true)
    sent(keying)
    expect(takeOwed(keying)).toBe(false)
  })

  it('still sends for an IME that never hands the key back', () => {
    const keying = newComposer()
    beganComposing(keying)
    maySendNow(keying)
    expect(endedComposing(keying)).toBe(true)
    expect(takeOwed(keying)).toBe(true)
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

describe('which keys send', () => {
  const press = (
    over: Partial<{ key: string; shift: boolean; alt: boolean; mod: boolean }> = {},
  ) => ({
    key: 'Enter',
    shift: false,
    alt: false,
    mod: false,
    ...over,
  })

  it('sends on a plain Enter, the way every chat this person uses does', () => {
    expect(sendKey(press(), true)).toBe(true)
  })

  it('makes a new line on Shift+Enter and Alt+Enter', () => {
    expect(sendKey(press({ shift: true }), true)).toBe(false)
    expect(sendKey(press({ alt: true }), true)).toBe(false)
  })

  it('keeps the modifier send working, for the hands that learned it', () => {
    expect(sendKey(press({ mod: true }), true)).toBe(true)
    expect(sendKey(press({ mod: true }), false)).toBe(true)
  })

  it('sends only with the modifier when Enter-sends is off', () => {
    expect(sendKey(press(), false)).toBe(false)
  })

  it('sends on no other key', () => {
    expect(sendKey(press({ key: 'a', mod: true }), true)).toBe(false)
  })
})
