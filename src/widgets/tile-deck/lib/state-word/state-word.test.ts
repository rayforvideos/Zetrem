import { describe, expect, it } from 'vitest'
import { saysItself, stateWord } from './state-word'

describe('stateWord: naming every state, since the roster and the report use the words', () => {
  it('names a state in a word', () => {
    expect(stateWord('working')).toBe('Working')
    expect(stateWord('done')).toBe('Done')
  })
})

describe('saysItself: which states speak for themselves', () => {
  it('knows which states need no extra word', () => {
    expect(saysItself('working')).toBe(true)
    expect(saysItself('waiting')).toBe(false)
  })
})
