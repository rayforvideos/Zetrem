import { describe, expect, it } from 'vitest'
import { isMac, modifierKey } from './platform'

const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

describe('단축키 이름은 그 기계의 이름이다', () => {
  it('맥에서는 ⌘, 윈도우에서는 Ctrl — 화면이 없는 키를 말하면 안 된다', () => {
    expect(modifierKey(MAC)).toBe('⌘')
    expect(modifierKey(WINDOWS)).toBe('Ctrl')
  })

  it('맥을 맥으로 알아본다', () => {
    expect(isMac(MAC)).toBe(true)
    expect(isMac(WINDOWS)).toBe(false)
  })
})
