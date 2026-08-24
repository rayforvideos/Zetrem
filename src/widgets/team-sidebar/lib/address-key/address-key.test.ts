import { describe, expect, it } from 'vitest'
import { addressKey } from './address-key'

const mod = (key: string) => ({ key, mod: true })

describe('the modifier and a digit pick who gets the task', () => {
  it('maps 1 through 9 onto the roster, in sidebar order', () => {
    expect(addressKey(mod('1'), 3)).toBe(0)
    expect(addressKey(mod('3'), 3)).toBe(2)
  })

  it('does nothing for a number nobody wears', () => {
    expect(addressKey(mod('4'), 3)).toBeNull()
    expect(addressKey(mod('9'), 0)).toBeNull()
  })

  it('clears the addressee on 0', () => {
    expect(addressKey(mod('0'), 3)).toBe('clear')
  })

  it('leaves plain digits alone, since someone may just be typing', () => {
    expect(addressKey({ key: '1', mod: false }, 3)).toBeNull()
  })

  it('answers no other key', () => {
    expect(addressKey(mod('a'), 3)).toBeNull()
    expect(addressKey(mod('Enter'), 3)).toBeNull()
  })
})
