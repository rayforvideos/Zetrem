import { describe, expect, it } from 'vitest'
import { hiddenLines, lineHeightOf } from './clipped'

describe('hiddenLines: how much of a body the box is hiding', () => {
  it('says nothing when the content fits', () => {
    expect(hiddenLines(200, 200, 20)).toBe(0)
  })

  it('counts the lines that fall past the bottom of the box', () => {
    expect(hiddenLines(400, 200, 20)).toBe(10)
  })

  it('ignores the fraction of a pixel subpixel layout leaves on a box that fits', () => {
    expect(hiddenLines(200.5, 200, 20)).toBe(0)
  })

  it('rounds a part-hidden line up to one, never down to none', () => {
    expect(hiddenLines(210, 200, 20)).toBe(1)
  })

  it('gives up rather than divide by a line height it could not read', () => {
    expect(hiddenLines(400, 200, 0)).toBe(0)
  })
})

describe('lineHeightOf: the line box to count in', () => {
  it('takes the computed length when there is one', () => {
    expect(lineHeightOf({ lineHeight: '21.6px', fontSize: '14px' })).toBeCloseTo(21.6)
  })

  it('falls back to the font size when the style computes to a keyword', () => {
    expect(lineHeightOf({ lineHeight: 'normal', fontSize: '20px' })).toBeCloseTo(24)
  })

  it('reports nothing measurable rather than a zero-height line', () => {
    expect(lineHeightOf({ lineHeight: 'normal', fontSize: '' })).toBe(0)
  })
})
