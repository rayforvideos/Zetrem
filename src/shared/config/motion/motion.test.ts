import { describe, expect, it } from 'vitest'
import { LAYOUT, MOTION, TILE_MIN_DWELL_MS, staggerDelay } from './motion'

describe('MOTION', () => {
  it('holds the timings the motion rules set', () => {
    expect(MOTION.fanMs).toBe(500)
    expect(MOTION.mergeMs).toBe(400)
    expect(MOTION.staggerMs).toBe(60)
  })

  it('closes faster than it opens', () => {
    expect(MOTION.mergeMs).toBeLessThan(MOTION.fanMs)
  })

  it('uses one easing curve everywhere', () => {
    expect(MOTION.easing).toMatch(/^cubic-bezier\(/)
  })
})

describe('staggerDelay', () => {
  it('offsets each tile by its place in the row', () => {
    expect(staggerDelay(0)).toBe(0)
    expect(staggerDelay(1)).toBe(60)
    expect(staggerDelay(3)).toBe(180)
  })

  it('finishes inside the transition even for the last tile to start', () => {
    expect(staggerDelay(5) + MOTION.fanMs).toBeLessThanOrEqual(MOTION.fanMs * 2)
  })
})

describe('LAYOUT', () => {
  it('keeps an outer margin, so the ground is always visible', () => {
    expect(LAYOUT.outerMarginPx).toBeGreaterThan(0)
  })
})

describe('TILE_MIN_DWELL_MS', () => {
  it('holds a tile longer than the fan-out lasts, so a new one can be read', () => {
    expect(TILE_MIN_DWELL_MS).toBeGreaterThan(MOTION.fanMs * 2)
  })
})
