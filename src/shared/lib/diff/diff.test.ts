import { describe, expect, it } from 'vitest'
import { diffRows } from './diff'

describe('reading a unified diff into lines a pane can colour', () => {
  it('marks what was added and what was taken away', () => {
    const rows = diffRows('context\n+added one\n-removed one\n')
    expect(rows.map((row) => row.tone)).toEqual(['plain', 'added', 'removed'])
    expect(rows[1]?.text).toBe('+added one')
  })

  it('leaves the file headers as headers, not as an add and a remove', () => {
    const rows = diffRows(
      'diff --git a/a.ts b/a.ts\nindex 1..2 100644\n--- a/a.ts\n+++ b/a.ts\n@@ -1 +1 @@\n',
    )
    expect(rows.map((row) => row.tone)).toEqual(['meta', 'meta', 'meta', 'meta', 'meta'])
  })

  it('drops the empty last line a diff always ends with, and keeps blank lines inside', () => {
    expect(diffRows('one\n\ntwo\n')).toHaveLength(3)
    expect(diffRows('')).toEqual([])
  })

  it('gives every line a key of its own, since two lines can read the same', () => {
    const keys = diffRows('+one\n+one\n').map((row) => row.key)
    expect(new Set(keys).size).toBe(2)
  })
})
