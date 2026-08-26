import { describe, expect, it } from 'vitest'
import { luminanceOf, tileOf } from './tile'

describe('luminanceOf: how bright a brand colour is', () => {
  it('reads the ends of the scale', () => {
    expect(luminanceOf('#000000')).toBeCloseTo(0, 3)
    expect(luminanceOf('#ffffff')).toBeCloseTo(1, 3)
  })

  it('weighs green above red above blue, the way an eye does', () => {
    expect(luminanceOf('#00ff00')).toBeGreaterThan(luminanceOf('#ff0000'))
    expect(luminanceOf('#ff0000')).toBeGreaterThan(luminanceOf('#0000ff'))
  })

  it('takes a colour it cannot read as middling rather than as black', () => {
    expect(luminanceOf('nonsense')).toBe(0.5)
  })
})

describe('tileOf: how to seat a brand mark so it can be seen', () => {
  it('gives a dark brand a light tile, since its own colour would vanish on ours', () => {
    for (const hex of ['#000000', '#181717', '#191919']) {
      expect(tileOf(hex), hex).toEqual({ bg: '#ffffff', ink: hex })
    }
  })

  it('gives a coloured brand its own tile', () => {
    expect(tileOf('#EA4335').bg).toBe('#EA4335')
  })

  it('picks whichever ink stands out more on the tile, rather than a fixed one', () => {
    expect(tileOf('#18BFFF').ink, 'a bright cyan reads better under black').toBe('#000000')
    expect(tileOf('#5E6AD2').ink, 'a mid indigo reads better under white').toBe('#ffffff')
  })

  it('turns a brand too dark for our board inside out instead of dimming it', () => {
    expect(tileOf('#362D59')).toEqual({ bg: '#ffffff', ink: '#362D59' })
  })

  it('clears the readable mark on every brand it carries', () => {
    const ratio = (a: number, b: number) => {
      const [hi, lo] = a > b ? [a, b] : [b, a]
      return (hi + 0.05) / (lo + 0.05)
    }
    for (const hex of [
      '#EA4335',
      '#4285F4',
      '#F06A6A',
      '#18BFFF',
      '#362D59',
      '#3FCF8E',
      '#5E6AD2',
    ]) {
      const tile = tileOf(hex)
      expect(ratio(luminanceOf(tile.bg), luminanceOf(tile.ink)), hex).toBeGreaterThan(3)
    }
  })

  it('never draws ink the same colour as the tile it sits on', () => {
    for (const hex of ['#000000', '#ffffff', '#EA4335', '#3FCF8E', '#362D59', '#5E6AD2']) {
      const tile = tileOf(hex)
      expect(tile.ink.toLowerCase(), hex).not.toBe(tile.bg.toLowerCase())
    }
  })
})
