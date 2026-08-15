import { describe, expect, it } from 'vitest'
import { lineDiff, linesOf } from './diff'

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

describe('a file that ends in a newline has no ghost last line', () => {
  it('counts four lines for a four line file, not five', () => {
    expect(linesOf('alpha\nbeta\ngamma\ndelta\n')).toEqual(['alpha', 'beta', 'gamma', 'delta'])
  })

  it('keeps a last line that was written without a newline', () => {
    expect(linesOf('alpha\nbeta')).toEqual(['alpha', 'beta'])
  })

  it('keeps a blank line that was written on purpose in the middle', () => {
    expect(linesOf('alpha\n\nbeta\n')).toEqual(['alpha', '', 'beta'])
  })

  it('has no lines at all in an empty file', () => {
    expect(linesOf('')).toEqual([])
  })

  it('draws a written file as one added row per line, with none left over', () => {
    const lines = lineDiff('', 'alpha\nbeta\ngamma\ndelta\n')
    expect(lines).toHaveLength(4)
    expect(lines.every((line) => line.kind === 'add')).toBe(true)
  })

  it('draws a deleted line as one removed row, not two', () => {
    const lines = lineDiff('gamma\n', '')
    expect(lines).toEqual([{ kind: 'remove', text: 'gamma' }])
  })
})
