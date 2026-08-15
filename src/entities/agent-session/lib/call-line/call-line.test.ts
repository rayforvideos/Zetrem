import { describe, expect, it } from 'vitest'
import { absorbs, mergedLine } from './call-line'

describe('mergedLine: the CLI announces one call more than once, in pieces', () => {
  it('takes the fuller line when the second announcement carries the argument', () => {
    expect(mergedLine('Bash', 'Bash npm test')).toBe('Bash npm test')
  })

  it('keeps what it has when the second announcement is barer than the first', () => {
    expect(mergedLine('Bash npm test', 'Bash')).toBe('Bash npm test')
  })

  it('keeps what it has when the second says nothing at all', () => {
    expect(mergedLine('Bash npm test', '   ')).toBe('Bash npm test')
  })

  it('takes the second when the first was empty', () => {
    expect(mergedLine('', 'Read a.ts')).toBe('Read a.ts')
  })
})

describe('absorbs: a row that only names the tool gives way to the real call', () => {
  it('gives way when the fuller line is the same tool with its argument', () => {
    expect(absorbs('Bash', 'Bash npm test')).toBe(true)
  })

  it('stands its ground when it already names what it did', () => {
    expect(absorbs('Bash ls', 'Bash npm test')).toBe(false)
  })

  it('stands its ground for a different tool', () => {
    expect(absorbs('Bash', 'Read a.ts')).toBe(false)
  })

  it('is not fooled by a tool whose name is a prefix of another', () => {
    expect(absorbs('Read', 'ReadFile a.ts')).toBe(false)
  })

  it('has nothing to give way from when there is no line', () => {
    expect(absorbs('', 'Bash ls')).toBe(false)
  })
})
