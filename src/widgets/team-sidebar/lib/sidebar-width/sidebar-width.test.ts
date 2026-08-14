import { describe, expect, it } from 'vitest'
import { SIDEBAR } from '@/shared/config/theme'
import { clampWidth, draggedWidth, nudgedWidth } from './sidebar-width'

describe('clampWidth: the board lives inside a readable width', () => {
  it('cannot be made too narrow or too wide', () => {
    expect(clampWidth(10)).toBe(SIDEBAR.min)
    expect(clampWidth(9999)).toBe(SIDEBAR.max)
  })

  it('keeps a value in range and leaves no fraction', () => {
    expect(clampWidth(240.4)).toBe(240)
  })

  it('falls back to the default width, so a spoiled saved value still draws', () => {
    expect(clampWidth(Number.NaN)).toBe(SIDEBAR.width)
    expect(clampWidth(Number.POSITIVE_INFINITY)).toBe(SIDEBAR.width)
  })
})

describe('draggedWidth: as far as the hand moved from where it took hold', () => {
  it('widens to the right and narrows to the left', () => {
    expect(draggedWidth(232, 40)).toBe(272)
    expect(draggedWidth(232, -40)).toBe(192)
  })

  it('stops at the limits however far the drag goes', () => {
    expect(draggedWidth(232, -9999)).toBe(SIDEBAR.min)
    expect(draggedWidth(232, 9999)).toBe(SIDEBAR.max)
  })
})

describe('nudgedWidth: moving it without a mouse', () => {
  it('steps by one notch on the arrow keys', () => {
    expect(nudgedWidth(232, 'ArrowRight')).toBe(232 + SIDEBAR.step)
    expect(nudgedWidth(232, 'ArrowLeft')).toBe(232 - SIDEBAR.step)
  })

  it('sends it to either end on Home and End', () => {
    expect(nudgedWidth(232, 'Home')).toBe(SIDEBAR.min)
    expect(nudgedWidth(232, 'End')).toBe(SIDEBAR.max)
  })

  it('changes nothing for a key that means nothing here', () => {
    expect(nudgedWidth(232, 'a')).toBe(null)
    expect(nudgedWidth(232, 'Enter')).toBe(null)
  })
})
