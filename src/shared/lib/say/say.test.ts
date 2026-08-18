import { describe, expect, it } from 'vitest'
import { chosenTongue, localeOf, tongueOf, tongueToLoad } from './say'

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

  it('carries the number locale with it', () => {
    expect(localeOf('ko')).toBe('ko-KR')
    expect(localeOf('en')).toBe('en-US')
  })
})

describe('tongueToLoad: never asks for a language twice', () => {
  it('asks for nothing while the settings are still being read', () => {
    expect(
      tongueToLoad('en', false, 'ko', KOREAN_MACHINE),
      '읽기 전 기본값으로 판단하면 켠 언어와 싸운다',
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
    expect(tongueToLoad('en', true, asked ?? '', KOREAN_MACHINE), '두 번째는 없어야 한다').toBe(null)
  })

  it('does not swing back while a remount is re-reading the settings', () => {
    const active = 'en'
    const duringRemount = tongueToLoad('system', false, active, KOREAN_MACHINE)
    expect(duringRemount, '기본값 system 은 한국어라 여기서 물면 무한 리마운트가 된다').toBe(null)
    expect(tongueToLoad('en', true, active, KOREAN_MACHINE)).toBe(null)
  })

  it('holds still when the read fails and the setting falls back to the machine', () => {
    expect(tongueToLoad('system', true, 'ko', KOREAN_MACHINE)).toBe(null)
  })
})
