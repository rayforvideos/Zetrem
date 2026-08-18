import { afterEach, describe, expect, it } from 'vitest'
import { i18n } from '@lingui/core'
import { tongueChoices } from './tongues'

afterEach(() => i18n.activate('en'))

describe('the language picker', () => {
  it('offers following the machine, English, and Korean', () => {
    expect(tongueChoices().map((one) => one.id)).toEqual(['system', 'en', 'ko'])
  })

  it('writes each language in that language, so you can find yours', () => {
    const [, english, korean] = tongueChoices()
    expect(english?.label).toBe('English')
    expect(korean?.label, '한국어를 못 읽는 영어로 적으면 찾을 수가 없다').toBe('한국어')
  })

  it('keeps those two names the same whichever language is being spoken', () => {
    i18n.activate('ko')
    const [, english, korean] = tongueChoices()
    expect(english?.label).toBe('English')
    expect(korean?.label).toBe('한국어')
  })
})
