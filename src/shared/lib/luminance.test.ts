import { describe, expect, it } from 'vitest'
import type { ImageSource } from './luminance'
import { luminanceRangeOfRect, sampleLuminance } from './luminance'

/** 왼쪽 절반 검정, 오른쪽 절반 흰색인 4x2 이미지 */
function halfAndHalf(): ImageSource {
  const width = 4
  const height = 2
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4
      const v = x < width / 2 ? 0 : 255
      data[i] = v
      data[i + 1] = v
      data[i + 2] = v
      data[i + 3] = 255
    }
  }
  return { width, height, data }
}

describe('sampleLuminance', () => {
  it('요청한 격자 크기만큼 셀을 낸다', () => {
    const p = sampleLuminance(halfAndHalf(), 2, 1)
    expect(p.cols).toBe(2)
    expect(p.rows).toBe(1)
    expect(p.cells).toHaveLength(2)
  })

  it('왼쪽 셀은 어둡고 오른쪽 셀은 밝다', () => {
    const p = sampleLuminance(halfAndHalf(), 2, 1)
    expect(p.cells[0]).toBeCloseTo(0, 5)
    expect(p.cells[1]).toBeCloseTo(1, 5)
  })

  it('셀이 픽셀보다 많아도 깨지지 않는다', () => {
    const p = sampleLuminance(halfAndHalf(), 8, 8)
    expect(p.cells).toHaveLength(64)
    expect(p.cells.every((c) => c >= 0 && c <= 1)).toBe(true)
  })
})

describe('luminanceRangeOfRect', () => {
  it('한 셀만 덮으면 min 과 max 가 같다', () => {
    const p = sampleLuminance(halfAndHalf(), 2, 1)
    expect(luminanceRangeOfRect(p, { x: 0, y: 0, w: 0.5, h: 1 })).toEqual({ min: 0, max: 0 })
  })

  it('밝기가 갈린 곳을 덮으면 평균이 아니라 양 끝이 나온다', () => {
    const p = sampleLuminance(halfAndHalf(), 2, 1)
    const { min, max } = luminanceRangeOfRect(p, { x: 0, y: 0, w: 1, h: 1 })
    expect(min).toBeCloseTo(0, 5)
    expect(max).toBeCloseTo(1, 5)
    // 평균(0.5)은 이 사각형 아래 어느 셀에서도 성립하지 않는 값이다
    expect((min + max) / 2).toBeCloseTo(0.5, 5)
  })

  it('격자 밖으로 나가도 값이 범위 안이고 min ≤ max 다', () => {
    const p = sampleLuminance(halfAndHalf(), 2, 1)
    const { min, max } = luminanceRangeOfRect(p, { x: -0.5, y: -0.5, w: 3, h: 3 })
    expect(min).toBeGreaterThanOrEqual(0)
    expect(max).toBeLessThanOrEqual(1)
    expect(min).toBeLessThanOrEqual(max)
  })

  it('어떤 셀도 덮지 못하면 검정으로 본다 — 안전한 쪽으로 틀린다', () => {
    const p = sampleLuminance(halfAndHalf(), 2, 1)
    expect(luminanceRangeOfRect(p, { x: 0.5, y: 0.5, w: 0, h: 0 })).toEqual({ min: 0, max: 0 })
  })
})
