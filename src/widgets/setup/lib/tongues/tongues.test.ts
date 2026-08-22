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
    expect(korean?.label, 'in English, somebody who cannot read Korean would never find it').toBe('한국어')
  })

  it('keeps those two names the same whichever language is being spoken', () => {
    i18n.activate('ko')
    const [, english, korean] = tongueChoices()
    expect(english?.label).toBe('English')
    expect(korean?.label).toBe('한국어')
  })
})
