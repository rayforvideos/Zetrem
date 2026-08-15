import { describe, expect, it } from 'vitest'
import { LAYOUT } from '@/shared/config/motion/motion'
import { layoutTiles, observatoryLayout, soloRect, roomToFan } from './grid'

const viewport = { w: 1440, h: 900 }
const M = LAYOUT.outerMarginPx

describe('layoutTiles', () => {
  it('returns as many rectangles as asked for', () => {
    for (const count of [1, 2, 3, 4, 5, 6, 7, 9]) {
      expect(layoutTiles(count, viewport)).toHaveLength(count)
    }
  })

  it('returns nothing for none', () => {
    expect(layoutTiles(0, viewport)).toEqual([])
  })

  it('never crosses the outer margin, at any count', () => {
    for (const count of [1, 2, 3, 4, 5, 6, 7, 8, 9, 12]) {
      for (const rect of layoutTiles(count, viewport)) {
        expect(rect.x, `count=${count}`).toBeGreaterThanOrEqual(M - 0.01)
        expect(rect.y, `count=${count}`).toBeGreaterThanOrEqual(M - 0.01)
        expect(rect.x + rect.w, `count=${count}`).toBeLessThanOrEqual(viewport.w - M + 0.01)
        expect(rect.y + rect.h, `count=${count}`).toBeLessThanOrEqual(viewport.h - M + 0.01)
      }
    }
  })

  it('never overlaps two tiles, at any count', () => {
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

  it('gives every tile a real size', () => {
    for (const rect of layoutTiles(12, viewport)) {
      expect(rect.w).toBeGreaterThan(0)
      expect(rect.h).toBeGreaterThan(0)
    }
  })

  it('lays five out as three then two', () => {
    const rects = layoutTiles(5, viewport)
    const topRow = rects.filter((r) => r.y === rects[0]!.y)
    expect(topRow).toHaveLength(3)
  })

  it('puts two side by side, because the screen is wider than it is tall', () => {
    const rects = layoutTiles(2, viewport)
    expect(rects[0]!.y).toBe(rects[1]!.y)
    expect(rects[0]!.x).toBeLessThan(rects[1]!.x)
  })

  it('gives the same layout for the same input', () => {
    expect(layoutTiles(4, viewport)).toEqual(layoutTiles(4, viewport))
  })
})

describe('soloRect', () => {
  it('fills the window when there is only one', () => {
    const rect = soloRect(viewport)
    expect(rect).toEqual({ x: 0, y: 0, w: viewport.w, h: viewport.h })
  })

  it('centres on both axes', () => {
    for (const size of [viewport, { w: 1024, h: 1280 }, { w: 900, h: 900 }]) {
      const rect = soloRect(size)
      expect(rect.x, `w=${size.w}`).toBeCloseTo(size.w - (rect.x + rect.w), 5)
      expect(rect.y, `h=${size.h}`).toBeCloseTo(size.h - (rect.y + rect.h), 5)
    }
  })
})

describe('layoutTiles: a grid that includes the terminal', () => {
  it('splits in two beside the terminal when one session appears', () => {
    const rects = layoutTiles(2, { w: 1440, h: 900 })
    expect(rects).toHaveLength(2)
    expect(rects[0]!.y).toBe(rects[1]!.y)
    expect(rects[1]!.x).toBeGreaterThan(rects[0]!.x)
  })
})

describe('observatoryLayout: the terminal is the desk, sessions are the boards beside it', () => {
  const viewport = { w: 1440, h: 900 }

  it('gives the terminal the screen when no session is running', () => {
    const { terminal, sessions } = observatoryLayout(0, viewport)
    expect(sessions).toHaveLength(0)
    expect(terminal.w).toBeGreaterThan(viewport.w * 0.8)
  })

  it('makes the terminal a left column and stacks sessions to its right', () => {
    const { terminal, sessions } = observatoryLayout(2, viewport)
    expect(sessions).toHaveLength(2)
    expect(terminal.x).toBeLessThan(sessions[0]!.x)
    expect(sessions[0]!.x).toBeGreaterThan(terminal.x + terminal.w - 1)
    expect(sessions[1]!.y).toBeGreaterThan(sessions[0]!.y)
    expect(terminal.h).toBeCloseTo(sessions[0]!.h + sessions[1]!.h + LAYOUT.gapPx, 0)
  })

  it('splits the right into two columns past four, so no board shrinks to a stamp', () => {
    const { sessions } = observatoryLayout(6, viewport)
    expect(sessions).toHaveLength(6)
    const columns = new Set(sessions.map((rect) => Math.round(rect.x)))
    expect(columns.size).toBe(2)
  })

  it('keeps an outer margin at any count, so the ground stays visible', () => {
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

describe('observatoryLayout: folding the roster away hands its room to the people working', () => {
  const viewport = { w: 1440, h: 900 }

  it('gives the conversation that much more width while the roster is open', () => {
    const open = observatoryLayout(2, viewport, 300)
    const shut = observatoryLayout(2, viewport, 40)
    expect(open.terminal.w).toBeGreaterThan(shut.terminal.w)
    expect(shut.sessions[0]!.w).toBeGreaterThan(open.sessions[0]!.w)
  })

  it('shares the room the roster gave up between the text and the boards', () => {
    const open = observatoryLayout(2, viewport, 300)
    const shut = observatoryLayout(2, viewport, 40)
    const reading = (rect: { w: number }, sidebar: number) => rect.w - sidebar
    expect(reading(shut.terminal, 40)).toBeGreaterThan(reading(open.terminal, 300))
  })

  it('keeps a floor under tile width, however wide the conversation gets', () => {
    const greedy = observatoryLayout(1, { w: 900, h: 700 }, 700)
    expect(greedy.sessions[0]!.w).toBeGreaterThanOrEqual(360)
  })
})

describe('roomToFan: whether the tiles can sit beside the conversation at all', () => {
  it('fans on a window with room for the column, the conversation and a tile', () => {
    expect(roomToFan({ w: 1440, h: 900 }, 328)).toBe(true)
  })

  it('does not fan when what is left for the conversation would be a sliver', () => {
    expect(roomToFan({ w: 900, h: 640 }, 328)).toBe(false)
  })

  it('fans on the same narrow window once the column is out of the way', () => {
    expect(roomToFan({ w: 900, h: 640 }, 0)).toBe(true)
  })

  it('still fans at the window size people actually use', () => {
    expect(roomToFan({ w: 1180, h: 760 }, 328)).toBe(true)
  })

  it('gives the conversation its floor wherever fanning is allowed at all', () => {
    for (const w of [1180, 1280, 1440, 1920]) {
      expect(roomToFan({ w, h: 900 }, 328)).toBe(true)
      const { terminal } = observatoryLayout(2, { w, h: 900 }, 328)
      expect(terminal.w - 328).toBeGreaterThanOrEqual(340)
    }
  })

  it('leaves the tile its floor even where that costs the conversation, since a tile cannot be negative', () => {
    const { sessions } = observatoryLayout(1, { w: 900, h: 640 }, 328)
    expect(sessions[0]!.w).toBeGreaterThanOrEqual(360)
  })
})
