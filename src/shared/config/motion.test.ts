import { describe, expect, it } from 'vitest'
import { LAYOUT, MOTION, TILE_MIN_DWELL_MS, staggerDelay } from './motion'

describe('MOTION', () => {
  it('스펙의 물 문법 값을 그대로 가진다', () => {
    expect(MOTION.fanMs).toBe(500)
    expect(MOTION.mergeMs).toBe(400)
    expect(MOTION.staggerMs).toBe(60)
  })

  it('닫힘이 열림보다 빠르다', () => {
    expect(MOTION.mergeMs).toBeLessThan(MOTION.fanMs)
  })

  it('이징은 cubic-bezier 하나로 통일돼 있다', () => {
    expect(MOTION.easing).toMatch(/^cubic-bezier\(/)
  })
})

describe('staggerDelay', () => {
  it('인덱스에 비례해 어긋난다', () => {
    expect(staggerDelay(0)).toBe(0)
    expect(staggerDelay(1)).toBe(60)
    expect(staggerDelay(3)).toBe(180)
  })

  it('마지막 타일이 늦게 시작해도 전체가 전환 시간 안에 끝난다', () => {
    // 타일 6개까지는 스태거 총합이 fanMs 를 넘지 않아야 물결로 읽힌다
    expect(staggerDelay(5) + MOTION.fanMs).toBeLessThanOrEqual(MOTION.fanMs * 2)
  })
})

describe('LAYOUT', () => {
  it('바깥 여백이 0 이 아니다 — 배경이 항상 보여야 한다', () => {
    expect(LAYOUT.outerMarginPx).toBeGreaterThan(0)
  })
})

describe('TILE_MIN_DWELL_MS', () => {
  it('타일 최소 체류시간은 분할 전환보다 길다 — 태어난 타일은 읽을 수 있어야 한다', () => {
    expect(TILE_MIN_DWELL_MS).toBeGreaterThan(MOTION.fanMs * 2)
  })
})
