import { describe, expect, it } from 'vitest'
import { diffHunks } from './hunks'

const DIFF = [
  'diff --git a/src/a.ts b/src/a.ts',
  'index ba0b0db..4869810 100644',
  '--- a/src/a.ts',
  '+++ b/src/a.ts',
  '@@ -3,4 +3,5 @@ function two()',
  ' kept one',
  '-gone',
  '+came one',
  '+came two',
  ' kept two',
  '@@ -10,2 +11,2 @@',
  ' far below',
  '-old tail',
  '+new tail',
  '',
].join('\n')

describe('diffHunks: a unified diff into numbered rows, meta dropped', () => {
  it('drops the file header lines and keeps the hunks', () => {
    const hunks = diffHunks(DIFF)
    expect(hunks).toHaveLength(2)
    expect(hunks[0]?.header).toBe('@@ -3,4 +3,5 @@ function two()')
  })

  it('numbers both sides, leaving the absent side blank', () => {
    const rows = diffHunks(DIFF)[0]?.lines
    expect(rows).toEqual([
      { kind: 'plain', oldNo: 3, newNo: 3, text: 'kept one' },
      { kind: 'removed', oldNo: 4, newNo: null, text: 'gone' },
      { kind: 'added', oldNo: null, newNo: 4, text: 'came one' },
      { kind: 'added', oldNo: null, newNo: 5, text: 'came two' },
      { kind: 'plain', oldNo: 5, newNo: 6, text: 'kept two' },
    ])
  })

  it('starts each hunk at the numbers its header names', () => {
    const rows = diffHunks(DIFF)[1]?.lines
    expect(rows?.[0]).toEqual({ kind: 'plain', oldNo: 10, newNo: 11, text: 'far below' })
  })

  it('reads a headerless all-additions body as one hunk from line one', () => {
    const hunks = diffHunks('+first\n+second\n')
    expect(hunks).toHaveLength(1)
    expect(hunks[0]?.header).toBe('')
    expect(hunks[0]?.lines).toEqual([
      { kind: 'added', oldNo: null, newNo: 1, text: 'first' },
      { kind: 'added', oldNo: null, newNo: 2, text: 'second' },
    ])
  })

  it('answers nothing for an empty diff', () => {
    expect(diffHunks('')).toEqual([])
  })
})
