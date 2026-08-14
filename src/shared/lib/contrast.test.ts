import { describe, expect, it } from 'vitest'
import { MIN_CONTRAST, contrastRatio, relativeLuminance } from './contrast'

describe('relativeLuminance', () => {
  it('검정은 0, 흰색은 1', () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBe(0)
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5)
  })

  it('녹색이 청색보다 밝게 계산된다', () => {
    const green = relativeLuminance({ r: 0, g: 255, b: 0 })
    const blue = relativeLuminance({ r: 0, g: 0, b: 255 })
    expect(green).toBeGreaterThan(blue)
  })
})

describe('contrastRatio', () => {
  it('흑백 대비는 21', () => {
    expect(contrastRatio(0, 1)).toBeCloseTo(21, 5)
  })

  it('인자 순서가 결과를 바꾸지 않는다', () => {
    expect(contrastRatio(0.1, 0.8)).toBeCloseTo(contrastRatio(0.8, 0.1), 10)
  })

  it('같은 밝기끼리는 1', () => {
    expect(contrastRatio(0.42, 0.42)).toBeCloseTo(1, 10)
  })

  it('AA 기준선은 4.5', () => {
    expect(MIN_CONTRAST).toBe(4.5)
  })
})
