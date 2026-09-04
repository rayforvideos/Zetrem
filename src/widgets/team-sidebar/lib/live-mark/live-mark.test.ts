import { describe, expect, it } from 'vitest'
import { liveMark } from './live-mark'

describe('liveMark', () => {
  it('says nothing for an idle chat', () => {
    expect(liveMark(undefined)).toBeNull()
  })
  it('names a working chat and one waiting on you', () => {
    expect(liveMark('working')?.tone).toBe('working')
    expect(liveMark('asking')?.tone).toBe('held')
    expect(liveMark('asking')?.label.length).toBeGreaterThan(0)
  })
  it('draws a question the same as a permission, and names it differently', () => {
    expect(liveMark('question')?.tone).toBe('held')
    expect(liveMark('question')?.label).not.toBe(liveMark('asking')?.label)
  })
  it('never draws a stopped run the way it draws a running one', () => {
    expect(liveMark('question')?.tone).not.toBe(liveMark('working')?.tone)
  })
})
