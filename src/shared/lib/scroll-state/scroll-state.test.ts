import { describe, expect, it } from 'vitest'
import { atEnd } from './scroll-state'

describe('atEnd: whether there is anything below to scroll to', () => {
  it('is at the end when everything already fits', () => {
    expect(atEnd(0, 300, 300)).toBe(true)
    expect(atEnd(0, 200, 300)).toBe(true)
  })

  it('is not at the end while there is more below', () => {
    expect(atEnd(0, 900, 300)).toBe(false)
  })

  it('is at the end once it has been scrolled all the way down', () => {
    expect(atEnd(600, 900, 300)).toBe(true)
  })

  it('forgives the fraction of a pixel a scroll can stop on', () => {
    expect(atEnd(595, 900, 300)).toBe(true)
  })

  it('is not fooled by being nearly there', () => {
    expect(atEnd(560, 900, 300)).toBe(false)
  })
})
