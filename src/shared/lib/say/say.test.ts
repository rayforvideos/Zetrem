import { describe, expect, it } from 'vitest'
import { chosenTongue, tongueOf, tongueToLoad } from './say'

const KOREAN_MACHINE = ['ko-KR', 'en-US']

describe('tongueOf: which language the machine is set to', () => {
  it('takes Korean from a Korean system', () => {
    expect(tongueOf(['ko-KR'])).toBe('ko')
  })

  it('falls back to English for anything it does not speak', () => {
    expect(tongueOf(['ja-JP'])).toBe('en')
    expect(tongueOf([])).toBe('en')
  })
})

describe('chosenTongue: the setting wins over the machine', () => {
  it('follows the machine when nothing was chosen', () => {
    expect(chosenTongue('system', KOREAN_MACHINE)).toBe('ko')
  })

  it('follows the choice against the machine', () => {
    expect(chosenTongue('en', KOREAN_MACHINE)).toBe('en')
  })
})

describe('tongueToLoad: never asks for a language twice', () => {
  it('asks for nothing while the settings are still being read', () => {
    expect(
      tongueToLoad('en', false, 'ko', KOREAN_MACHINE),
      'judging by the default before it is read fights the language somebody chose',
    ).toBe(null)
  })

  it('asks for nothing once the language is already the one being spoken', () => {
    expect(tongueToLoad('en', true, 'en', KOREAN_MACHINE)).toBe(null)
    expect(tongueToLoad('system', true, 'ko', KOREAN_MACHINE)).toBe(null)
  })

  it('asks for the chosen one when it differs', () => {
    expect(tongueToLoad('en', true, 'ko', KOREAN_MACHINE)).toBe('en')
  })

  it('settles after one change rather than swinging back', () => {
    const asked = tongueToLoad('en', true, 'ko', KOREAN_MACHINE)
    expect(asked).toBe('en')
    expect(tongueToLoad('en', true, asked ?? '', KOREAN_MACHINE), 'there is no second one').toBe(
      null,
    )
  })

  it('does not swing back while a remount is re-reading the settings', () => {
    const active = 'en'
    const duringRemount = tongueToLoad('system', false, active, KOREAN_MACHINE)
    expect(
      duringRemount,
      'system defaults to Korean here, and biting on that remounts forever',
    ).toBe(null)
    expect(tongueToLoad('en', true, active, KOREAN_MACHINE)).toBe(null)
  })

  it('holds still when the read fails and the setting falls back to the machine', () => {
    expect(tongueToLoad('system', true, 'ko', KOREAN_MACHINE)).toBe(null)
  })
})
