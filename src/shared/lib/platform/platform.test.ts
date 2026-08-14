import { describe, expect, it } from 'vitest'
import { isMac, modifierKey } from './platform'

const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

describe('a shortcut is named the way the machine names it', () => {
  it('says Command on a Mac and Ctrl on Windows, never a key the keyboard lacks', () => {
    expect(modifierKey(MAC)).toBe('⌘')
    expect(modifierKey(WINDOWS)).toBe('Ctrl')
  })

  it('recognises a Mac as a Mac', () => {
    expect(isMac(MAC)).toBe(true)
    expect(isMac(WINDOWS)).toBe(false)
  })
})
