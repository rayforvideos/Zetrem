import { describe, expect, it } from 'vitest'
import { GUIDE_ID, isGuide } from './guide'

describe('isGuide', () => {
  it('knows the one note that is the guide', () => {
    expect(isGuide(GUIDE_ID)).toBe(true)
  })

  it('is false for a filed note and for nothing open', () => {
    expect(isGuide('analysis/api-choice.md')).toBe(false)
    expect(isGuide(null)).toBe(false)
  })
})
