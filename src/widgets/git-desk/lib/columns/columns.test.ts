import { describe, expect, it } from 'vitest'
import { GIT_COLUMNS, GIT_COLUMN_STEP } from '@/shared/config/theme'
import {
  clampColumn,
  columnPull,
  draggedColumn,
  nudgedColumn,
  resetColumn,
  withColumn,
} from './columns'
import type { GitColumns } from './columns.types'

const LAID: GitColumns = {
  refs: GIT_COLUMNS.refs.width,
  changes: GIT_COLUMNS.changes.width,
  author: GIT_COLUMNS.author.width,
  sha: GIT_COLUMNS.sha.width,
  when: GIT_COLUMNS.when.width,
}

describe('clampColumn: a column keeps a width it can still be read at', () => {
  it('holds every column above its own floor', () => {
    expect(clampColumn('refs', 0)).toBe(GIT_COLUMNS.refs.min)
    expect(clampColumn('sha', 1)).toBe(GIT_COLUMNS.sha.min)
    expect(clampColumn('when', -400)).toBe(GIT_COLUMNS.when.min)
  })

  it('stops a column from swallowing the table', () => {
    expect(clampColumn('refs', 9999)).toBe(GIT_COLUMNS.refs.max)
    expect(clampColumn('author', 9999)).toBe(GIT_COLUMNS.author.max)
  })

  it('leaves no fraction behind, since half a pixel of a column is a seam', () => {
    expect(clampColumn('changes', 140.6)).toBe(141)
  })

  it('falls back to the default, so a spoiled width still draws a table', () => {
    expect(clampColumn('refs', Number.NaN)).toBe(GIT_COLUMNS.refs.width)
    expect(clampColumn('changes', Number.POSITIVE_INFINITY)).toBe(GIT_COLUMNS.changes.width)
  })
})

describe('columnPull: the grip goes where the hand goes', () => {
  it('widens the refs column as its right edge is pushed out', () => {
    expect(columnPull('refs')).toBe(1)
  })

  it('widens the columns after the message as their left edge is pulled back', () => {
    expect(columnPull('changes')).toBe(-1)
    expect(columnPull('author')).toBe(-1)
    expect(columnPull('sha')).toBe(-1)
    expect(columnPull('when')).toBe(-1)
  })
})

describe('draggedColumn: as far as the hand moved from where it took hold', () => {
  it('grows the refs column to the right and shrinks it to the left', () => {
    expect(draggedColumn('refs', 112, 40)).toBe(152)
    expect(draggedColumn('refs', 112, -40)).toBe(72)
  })

  it('grows a column after the message to the left, because that is where its grip is', () => {
    expect(draggedColumn('author', 96, -40)).toBe(136)
    expect(draggedColumn('author', 96, 40)).toBe(56)
  })

  it('stops at the limits however far the drag goes', () => {
    expect(draggedColumn('refs', 112, 9999)).toBe(GIT_COLUMNS.refs.max)
    expect(draggedColumn('refs', 112, -9999)).toBe(GIT_COLUMNS.refs.min)
    expect(draggedColumn('when', 48, -9999)).toBe(GIT_COLUMNS.when.max)
  })
})

describe('nudgedColumn: moving a divider without a mouse', () => {
  it('steps by one notch, the way the grip would have travelled', () => {
    expect(nudgedColumn('refs', 112, 'ArrowRight')).toBe(112 + GIT_COLUMN_STEP)
    expect(nudgedColumn('refs', 112, 'ArrowLeft')).toBe(112 - GIT_COLUMN_STEP)
    expect(nudgedColumn('sha', 56, 'ArrowLeft')).toBe(56 + GIT_COLUMN_STEP)
    expect(nudgedColumn('sha', 56, 'ArrowRight')).toBe(56 - GIT_COLUMN_STEP)
  })

  it('holds at the floor rather than stepping under it', () => {
    expect(nudgedColumn('when', GIT_COLUMNS.when.min, 'ArrowRight')).toBe(GIT_COLUMNS.when.min)
  })

  it('changes nothing for a key that means nothing here', () => {
    expect(nudgedColumn('refs', 112, 'Enter')).toBe(null)
    expect(nudgedColumn('refs', 112, 'a')).toBe(null)
  })
})

describe('withColumn and resetColumn: one column moves, the rest stay put', () => {
  it('sets the named column and leaves the others as they were', () => {
    expect(withColumn(LAID, 'refs', 200)).toEqual({ ...LAID, refs: 200 })
  })

  it('pulls what it is handed into range on the way in', () => {
    expect(withColumn(LAID, 'sha', 9999).sha).toBe(GIT_COLUMNS.sha.max)
  })

  it('puts one column back to its default without touching the rest', () => {
    const wide = withColumn(withColumn(LAID, 'refs', 300), 'author', 200)
    expect(resetColumn(wide, 'refs')).toEqual({ ...wide, refs: GIT_COLUMNS.refs.width })
  })
})
