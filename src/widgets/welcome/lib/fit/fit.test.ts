import { describe, expect, it } from 'vitest'
import { MOCK_HEIGHT, MOCK_WIDTH, fitScale } from './fit'

describe('fitScale: the model is as big as the room allows', () => {
  it('stops growing on a wide screen, since it is a model and not the app', () => {
    expect(fitScale(4000, 3000)).toBe(0.82)
  })

  it('shrinks to the narrower side', () => {
    expect(fitScale(MOCK_WIDTH / 2, MOCK_HEIGHT * 4)).toBeCloseTo(0.5, 5)
    expect(fitScale(MOCK_WIDTH * 4, MOCK_HEIGHT / 4)).toBeCloseTo(0.3, 5)
  })

  it('fits the smallest window the app allows', () => {
    const scale = fitScale(720 - 48, 520 - 260)
    expect(MOCK_WIDTH * scale).toBeLessThanOrEqual(720 - 48)
    expect(MOCK_HEIGHT * scale).toBeLessThanOrEqual(520 - 260 + 1)
  })

  it('keeps a floor, so it never becomes a smudge', () => {
    expect(fitScale(10, 10)).toBe(0.3)
  })

  it('holds still while nothing has been measured yet', () => {
    expect(fitScale(0, 0)).toBe(0.82)
  })
})
