import { describe, expect, it } from 'vitest'
import { FACES, isFaceId, tidyUserName } from './face'

describe('the faces a person can wear', () => {
  it('offers the five drawn for it', () => {
    expect(FACES).toHaveLength(5)
    expect(FACES).toContain('onigiri')
  })

  it('knows one of its own from anything else', () => {
    expect(isFaceId('ghost')).toBe(true)
    expect(isFaceId('heart')).toBe(false)
    expect(isFaceId(null)).toBe(false)
  })
})

describe('tidyUserName: a name is one line, and not an essay', () => {
  it('folds runs of space into one and trims the ends', () => {
    expect(tidyUserName('  Ray   Kim  ')).toBe('Ray Kim')
  })

  it('flattens a pasted newline rather than breaking the row', () => {
    expect(tidyUserName('Ray\nKim')).toBe('Ray Kim')
  })

  it('cuts a name too long to sit beside a message', () => {
    expect(tidyUserName('R'.repeat(40))).toHaveLength(24)
  })
})
