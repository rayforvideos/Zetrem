import { describe, expect, it } from 'vitest'
import { SLIDES, lastSlide, stepTo } from './slides'

describe('the welcome is a few slides you can walk either way', () => {
  it('walks the screen rather than repeating one picture', () => {
    expect(new Set(SLIDES.map((slide) => slide.focus)).size).toBeGreaterThan(3)
    expect(SLIDES[0]?.focus).toBe('all')
  })

  it('has something to say on every slide', () => {
    expect(SLIDES.length).toBeGreaterThan(2)
    for (const slide of SLIDES) {
      expect(slide.title.length).toBeGreaterThan(0)
      expect(slide.body.length).toBeGreaterThan(20)
    }
  })

  it('gives each slide its own key, so none of them share a place', () => {
    expect(new Set(SLIDES.map((slide) => slide.key)).size).toBe(SLIDES.length)
  })

  it('walks forward and back', () => {
    expect(stepTo(0, 1)).toBe(1)
    expect(stepTo(1, -1)).toBe(0)
  })

  it('stops at both ends rather than wrapping, since a tour has a first and a last', () => {
    expect(stepTo(0, -1)).toBe(0)
    expect(stepTo(SLIDES.length - 1, 1)).toBe(SLIDES.length - 1)
  })

  it('knows when there is nothing further to show', () => {
    expect(lastSlide(SLIDES.length - 1)).toBe(true)
    expect(lastSlide(0)).toBe(false)
  })
})
