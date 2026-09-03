import { i18n } from '@lingui/core'
import { describe, expect, it } from 'vitest'
import { spokenLine } from './spoken'

describe('the line naming the language teammates speak', () => {
  it('names English on an English screen, code and paths excepted', () => {
    expect(spokenLine()).toContain('Speak English only, from your first sentence on')
    expect(spokenLine()).toContain('Code, commands, paths and identifiers stay as they are.')
  })

  it('names Korean on a Korean screen', () => {
    i18n.activate('ko')
    try {
      expect(spokenLine()).not.toContain('English')
      expect(spokenLine().length).toBeGreaterThan(10)
    } finally {
      i18n.activate('en')
    }
  })
})
