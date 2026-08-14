import { describe, expect, it } from 'vitest'
import { lineDiff } from './diff'

describe('lineDiff: seeing the two halves of an edit side by side', () => {
  it('marks only the lines that changed', () => {
    expect(lineDiff('a\nb\nc', 'a\nB\nc')).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'remove', text: 'b' },
      { kind: 'add', text: 'B' },
      { kind: 'same', text: 'c' },
    ])
  })

  it('shows additions alone when nothing was removed', () => {
    expect(lineDiff('a', 'a\nb')).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'add', text: 'b' },
    ])
  })

  it('shows removals alone when nothing was added', () => {
    expect(lineDiff('a\nb', 'a')).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'remove', text: 'b' },
    ])
  })

  it('keeps context only through a long run of unchanged lines', () => {
    const before = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'x'].join('\n')
    const after = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'y'].join('\n')
    const diff = lineDiff(before, after, 2)
    expect(diff.filter((line) => line.kind === 'same').length).toBeLessThanOrEqual(4)
    expect(diff.some((line) => line.text === '…')).toBe(true)
    expect(diff.some((line) => line.kind === 'remove' && line.text === 'x')).toBe(true)
  })

  it('draws nothing between two empty strings', () => {
    expect(lineDiff('', '')).toEqual([])
  })

  it('has no context to keep before a change on the first line', () => {
    expect(lineDiff('a\nb\nc', 'A\nb\nc')).toEqual([
      { kind: 'remove', text: 'a' },
      { kind: 'add', text: 'A' },
      { kind: 'same', text: 'b' },
      { kind: 'same', text: 'c' },
    ])
  })

  it('has no context to keep after a change on the last line', () => {
    expect(lineDiff('a\nb', 'a\nb\nC')).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'same', text: 'b' },
      { kind: 'add', text: 'C' },
    ])
  })

  it('marks the whole of the other side when one side is empty', () => {
    expect(lineDiff('', 'a\nb')).toEqual([
      { kind: 'add', text: 'a' },
      { kind: 'add', text: 'b' },
    ])
    expect(lineDiff('a\nb', '')).toEqual([
      { kind: 'remove', text: 'a' },
      { kind: 'remove', text: 'b' },
    ])
  })
})
