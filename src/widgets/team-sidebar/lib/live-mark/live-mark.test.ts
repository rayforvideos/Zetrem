import { describe, expect, it } from 'vitest'
import { liveMark } from './live-mark'

describe('liveMark', () => {
  it('says nothing for an idle chat', () => {
    expect(liveMark(undefined)).toBeNull()
  })
  it('names a working chat and one waiting on you', () => {
    expect(liveMark('working')?.tone).toBe('working')
    expect(liveMark('asking')?.tone).toBe('asking')
    expect(liveMark('asking')?.label.length).toBeGreaterThan(0)
  })
})
