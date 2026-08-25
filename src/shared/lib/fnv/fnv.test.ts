import { describe, expect, it } from 'vitest'
import { fnv1a } from './fnv'

describe('fnv1a', () => {
  it('gives the same name the same number every time', () => {
    expect(fnv1a('Explore')).toBe(fnv1a('Explore'))
  })

  it('is the published FNV-1a, so a face nobody chose does not move under them', () => {
    expect(fnv1a('')).toBe(0x811c9dc5)
    expect(fnv1a('a')).toBe(0xe40c292c)
    expect(fnv1a('foobar')).toBe(0xbf9cf968)
  })

  it('tells two names apart', () => {
    expect(fnv1a('scout')).not.toBe(fnv1a('reviewer'))
  })

  it('stays an unsigned 32-bit number', () => {
    for (const name of ['', 'a', 'a much longer subagent type name', '한국어']) {
      const value = fnv1a(name)
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(0xffffffff)
    }
  })
})
