import { afterEach, describe, expect, it } from 'vitest'
import { i18n } from '@lingui/core'
import { themeChoices } from './themes'

afterEach(() => i18n.activate('en'))

describe('the appearance picker', () => {
  it('offers following the OS, dark, and light', () => {
    expect(themeChoices().map((one) => one.id)).toEqual(['system', 'dark', 'light'])
  })
})
