import { describe, expect, it } from 'vitest'
import { chipWord, saysItself, stateWord } from './state-word'

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

describe('chipWord: the chip a tile carries beside the name', () => {
  it('carries nothing while the teammate is working and the run is its own', () => {
    expect(chipWord('working', false)).toBeNull()
  })

  it('says you are the one being waited on once the run has stopped for you', () => {
    expect(chipWord('working', true)).toBe('Waiting on you')
  })

  it('leaves a teammate that stopped on its own account saying what it is', () => {
    expect(chipWord('waiting', true)).toBe(stateWord('waiting'))
  })

  it('says nothing about a teammate that has already finished', () => {
    expect(chipWord('done', true)).toBeNull()
    expect(chipWord('reported', true)).toBeNull()
  })
})
