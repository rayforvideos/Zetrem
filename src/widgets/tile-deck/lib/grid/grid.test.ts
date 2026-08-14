import { describe, expect, it } from 'vitest'
import { LAYOUT } from '@/shared/config/motion/motion'
import { layoutTiles, observatoryLayout, soloRect } from './grid'

const viewport = { w: 1440, h: 900 }
const M = LAYOUT.outerMarginPx

describe('layoutTiles', () => {
  it('요청한 개수만큼 사각형을 낸다', () => {
    for (const count of [1, 2, 3, 4, 5, 6, 7, 9]) {
      expect(layoutTiles(count, viewport)).toHaveLength(count)
    }
  })

  it('0개면 빈 배열', () => {
    expect(layoutTiles(0, viewport)).toEqual([])
  })

  it('어떤 개수에서도 바깥 여백을 침범하지 않는다', () => {
    for (const count of [1, 2, 3, 4, 5, 6, 7, 8, 9, 12]) {
      for (const rect of layoutTiles(count, viewport)) {
        expect(rect.x, `count=${count}`).toBeGreaterThanOrEqual(M - 0.01)
        expect(rect.y, `count=${count}`).toBeGreaterThanOrEqual(M - 0.01)
        expect(rect.x + rect.w, `count=${count}`).toBeLessThanOrEqual(viewport.w - M + 0.01)
        expect(rect.y + rect.h, `count=${count}`).toBeLessThanOrEqual(viewport.h - M + 0.01)
      }
    }
  })

  it('어떤 개수에서도 타일끼리 겹치지 않는다', () => {
    for (const count of [1, 2, 3, 4, 5, 6, 7, 8, 9, 12]) {
      const rects = layoutTiles(count, viewport)
      for (let i = 0; i < rects.length; i += 1) {
        for (let j = i + 1; j < rects.length; j += 1) {
          const a = rects[i]!
          const b = rects[j]!
          const overlaps = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
          expect(overlaps, `count=${count}: ${i} 와 ${j} 가 겹친다`).toBe(false)
        }
      }
    }
  })

  it('모든 타일이 양의 크기를 가진다', () => {
    for (const rect of layoutTiles(12, viewport)) {
      expect(rect.w).toBeGreaterThan(0)
      expect(rect.h).toBeGreaterThan(0)
    }
  })

  it('5개는 첫 행에 3개, 둘째 행에 2개가 놓인다', () => {
    const rects = layoutTiles(5, viewport)
    const topRow = rects.filter((r) => r.y === rects[0]!.y)
    expect(topRow).toHaveLength(3)
  })

  it('2개는 가로로 나란히 놓인다 — 화면이 가로로 넓다', () => {
    const rects = layoutTiles(2, viewport)
    expect(rects[0]!.y).toBe(rects[1]!.y)
    expect(rects[0]!.x).toBeLessThan(rects[1]!.x)
  })

  it('같은 입력이면 같은 출력이다', () => {
    expect(layoutTiles(4, viewport)).toEqual(layoutTiles(4, viewport))
  })
})

describe('soloRect', () => {
  it('한 장뿐일 때는 창을 가득 채운다', () => {
    const rect = soloRect(viewport)
    expect(rect).toEqual({ x: 0, y: 0, w: viewport.w, h: viewport.h })
  })

  it('가로 세로 모두 가운데 정렬된다', () => {
    for (const size of [viewport, { w: 1024, h: 1280 }, { w: 900, h: 900 }]) {
      const rect = soloRect(size)
      expect(rect.x, `w=${size.w}`).toBeCloseTo(size.w - (rect.x + rect.w), 5)
      expect(rect.y, `h=${size.h}`).toBeCloseTo(size.h - (rect.y + rect.h), 5)
    }
  })
})

describe('layoutTiles — 터미널을 포함한 격자', () => {
  it('세션 하나가 생기면 터미널과 나란히 둘로 갈라진다', () => {
    const rects = layoutTiles(2, { w: 1440, h: 900 })
    expect(rects).toHaveLength(2)
    expect(rects[0]!.y).toBe(rects[1]!.y)
    expect(rects[1]!.x).toBeGreaterThan(rects[0]!.x)
  })
})

describe('observatoryLayout — 터미널이 일터, 세션은 곁의 판들', () => {
  const viewport = { w: 1440, h: 900 }

  it('세션이 없으면 터미널이 화면을 갖는다', () => {
    const { terminal, sessions } = observatoryLayout(0, viewport)
    expect(sessions).toHaveLength(0)
    expect(terminal.w).toBeGreaterThan(viewport.w * 0.8)
  })

  it('세션이 생기면 터미널은 왼쪽 기둥이 되고 세션이 오른쪽에 쌓인다', () => {
    const { terminal, sessions } = observatoryLayout(2, viewport)
    expect(sessions).toHaveLength(2)
    expect(terminal.w).toBeGreaterThan(sessions[0]!.w)
    expect(sessions[0]!.x).toBeGreaterThan(terminal.x + terminal.w - 1)
    expect(sessions[1]!.y).toBeGreaterThan(sessions[0]!.y)
    expect(terminal.h).toBeCloseTo(sessions[0]!.h + sessions[1]!.h + LAYOUT.gapPx, 0)
  })

  it('세션이 넷을 넘으면 오른쪽이 두 줄로 갈라진다 — 판이 우표만 해지지 않게', () => {
    const { sessions } = observatoryLayout(6, viewport)
    expect(sessions).toHaveLength(6)
    const columns = new Set(sessions.map((rect) => Math.round(rect.x)))
    expect(columns.size).toBe(2)
  })

  it('어떤 수에서도 바깥 여백이 남는다 — 배경이 보여야 한다 (스펙 §2.2)', () => {
    for (const count of [0, 1, 3, 5, 9]) {
      const { terminal, sessions } = observatoryLayout(count, viewport)
      for (const rect of [terminal, ...sessions]) {
        expect(rect.x).toBeGreaterThanOrEqual(LAYOUT.outerMarginPx - 0.5)
        expect(rect.y).toBeGreaterThanOrEqual(LAYOUT.outerMarginPx - 0.5)
        expect(rect.x + rect.w).toBeLessThanOrEqual(viewport.w - LAYOUT.outerMarginPx + 0.5)
        expect(rect.y + rect.h).toBeLessThanOrEqual(viewport.h - LAYOUT.outerMarginPx + 0.5)
      }
    }
  })
})
