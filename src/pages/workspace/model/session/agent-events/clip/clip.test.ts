import { describe, expect, it } from 'vitest'
import { clip } from './clip'

describe('clip: shortening a line so it reads as shortened', () => {
  it('leaves a line that already fits', () => {
    expect(clip('short enough', 40)).toBe('short enough')
  })

  it('marks a line it had to cut, so nobody reads it as the whole thing', () => {
    expect(clip('one two three four five six seven', 20)).toMatch(/…$/)
  })

  it('cuts between words rather than through one', () => {
    expect(clip('one two three four five six seven', 20)).toBe('one two three four…')
  })

  it('cuts mid word when there is no space worth keeping', () => {
    expect(clip('aaaaaaaaaaaaaaaaaaaaaaaa b', 10)).toBe('aaaaaaaaaa…')
  })

  it('does not leave punctuation dangling before the mark', () => {
    expect(clip('First sentence here, and then more', 20)).toBe('First sentence here…')
  })

  it('trims what it was given, since a stream can carry stray space', () => {
    expect(clip('  padded  ', 40)).toBe('padded')
  })

  it('keeps an empty line empty', () => {
    expect(clip('', 10)).toBe('')
  })

  it('shows nothing at all rather than a mark on its own when there is no room', () => {
    expect(clip('anything', 0)).toBe('')
    expect(clip('anything', -1)).toBe('')
  })
})
