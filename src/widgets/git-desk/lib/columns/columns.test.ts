import { describe, expect, it } from 'vitest'
import { GIT_COLUMNS, GIT_COLUMN_STEP, GIT_TABLE } from '@/shared/config/theme'
import {
  clampColumn,
  columnCeiling,
  columnPull,
  columnRoom,
  draggedColumn,
  fittedColumns,
  heldColumn,
  nudgedColumn,
  resetColumn,
  withColumn,
} from './columns'
import type { GitColumnName, GitColumns } from './columns.types'

const LAID: GitColumns = {
  refs: GIT_COLUMNS.refs.width,
  changes: GIT_COLUMNS.changes.width,
  author: GIT_COLUMNS.author.width,
  sha: GIT_COLUMNS.sha.width,
  when: GIT_COLUMNS.when.width,
}

const ALL: GitColumnName[] = ['refs', 'changes', 'author', 'sha', 'when']

// A ceiling no drag in these cases can reach, for the ones that are about a
// column's own range rather than about the room the window has left it.
const ROOMY = 9999

// A graph two lanes wide, which is what a small repository draws.
const GRAPH = 40

// Every floor added up: the narrowest the table can draw these columns at.
const FLOORS = ALL.reduce((sum, name) => sum + GIT_COLUMNS[name].min, 0)

// The table width that leaves the columns exactly this much room between them.
function tableFor(room: number, columns: number): number {
  const frame =
    GIT_TABLE.pad * 2 + (columns + 1) * GIT_TABLE.gap + GIT_TABLE.gutter + GRAPH + GIT_TABLE.message
  return room + frame
}

function widthOf(columns: GitColumns, shown: readonly GitColumnName[]): number {
  return shown.reduce((sum, name) => sum + columns[name], 0)
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

describe('heldColumn: a width the table can actually give today', () => {
  it('lets the ceiling cut a width the column itself would have allowed', () => {
    expect(heldColumn('refs', 400, 180)).toBe(180)
  })

  it('keeps the floor when the ceiling has fallen under it, because an empty cell reads as a fault', () => {
    expect(heldColumn('sha', 200, 10)).toBe(GIT_COLUMNS.sha.min)
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
    expect(draggedColumn('refs', 112, 40, ROOMY)).toBe(152)
    expect(draggedColumn('refs', 112, -40, ROOMY)).toBe(72)
  })

  it('grows a column after the message to the left, because that is where its grip is', () => {
    expect(draggedColumn('author', 96, -40, ROOMY)).toBe(136)
    expect(draggedColumn('author', 96, 40, ROOMY)).toBe(56)
  })

  it('stops at the limits however far the drag goes', () => {
    expect(draggedColumn('refs', 112, 9999, ROOMY)).toBe(GIT_COLUMNS.refs.max)
    expect(draggedColumn('refs', 112, -9999, ROOMY)).toBe(GIT_COLUMNS.refs.min)
    expect(draggedColumn('when', 48, -9999, ROOMY)).toBe(GIT_COLUMNS.when.max)
  })

  it('stops at the ceiling the window leaves, well short of the column own limit', () => {
    expect(draggedColumn('refs', 112, 9999, 200)).toBe(200)
    expect(draggedColumn('author', 96, -9999, 140)).toBe(140)
  })
})

describe('nudgedColumn: moving a divider without a mouse', () => {
  it('steps by one notch, the way the grip would have travelled', () => {
    expect(nudgedColumn('refs', 112, 'ArrowRight', ROOMY)).toBe(112 + GIT_COLUMN_STEP)
    expect(nudgedColumn('refs', 112, 'ArrowLeft', ROOMY)).toBe(112 - GIT_COLUMN_STEP)
    expect(nudgedColumn('sha', 56, 'ArrowLeft', ROOMY)).toBe(56 + GIT_COLUMN_STEP)
    expect(nudgedColumn('sha', 56, 'ArrowRight', ROOMY)).toBe(56 - GIT_COLUMN_STEP)
  })

  it('holds at the floor rather than stepping under it', () => {
    expect(nudgedColumn('when', GIT_COLUMNS.when.min, 'ArrowRight', ROOMY)).toBe(
      GIT_COLUMNS.when.min,
    )
  })

  it('holds at the ceiling rather than stepping past it', () => {
    expect(nudgedColumn('refs', 120, 'ArrowRight', 120)).toBe(120)
    expect(nudgedColumn('author', 120, 'ArrowLeft', 120)).toBe(120)
  })

  it('changes nothing for a key that means nothing here', () => {
    expect(nudgedColumn('refs', 112, 'Enter', ROOMY)).toBe(null)
    expect(nudgedColumn('refs', 112, 'a', ROOMY)).toBe(null)
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

describe('columnRoom: what is left of the table once the frame has had its share', () => {
  it('offers every saved width in full before the pane has been measured', () => {
    const room = columnRoom(0, GRAPH)
    expect(room.shown).toEqual(ALL)
    expect(room.room).toBe(Number.POSITIVE_INFINITY)
  })

  it('counts out the padding, the seams, the gutter, the graph and the message', () => {
    expect(columnRoom(tableFor(300, 5), GRAPH).room).toBe(300)
  })

  it('keeps every column as long as their floors still fit, however tight that is', () => {
    expect(columnRoom(tableFor(FLOORS, 5), GRAPH).shown).toEqual(ALL)
  })

  it('lets the author step aside first, and the change bars next', () => {
    expect(columnRoom(tableFor(FLOORS - 1, 5), GRAPH).shown).toEqual([
      'refs',
      'changes',
      'sha',
      'when',
    ])
    expect(columnRoom(380, GRAPH).shown).toEqual(['refs', 'sha', 'when'])
  })

  it('hands back the room the column that left was holding, seam and all', () => {
    expect(columnRoom(tableFor(FLOORS - 1, 5), GRAPH).room).toBe(FLOORS - 1 + GIT_TABLE.gap)
  })

  it('leaves the columns less room as the graph takes more lanes', () => {
    const table = tableFor(300, 5)
    expect(columnRoom(table, GRAPH + 18).room).toBe(columnRoom(table, GRAPH).room - 18)
  })
})

describe('fittedColumns: the saved widths pulled into the room there is', () => {
  it('leaves the widths alone when they already fit', () => {
    const room = columnRoom(tableFor(600, 5), GRAPH)
    expect(fittedColumns(LAID, room.shown, room.room)).toEqual(LAID)
  })

  it('takes the same share off every column rather than pushing the last ones off the edge', () => {
    const saved: GitColumns = { refs: 200, changes: 200, author: 200, sha: 100, when: 100 }
    const fitted = fittedColumns(saved, ALL, 400)
    expect(fitted).toEqual({ refs: 100, changes: 100, author: 100, sha: 50, when: 50 })
    expect(widthOf(fitted, ALL)).toBeLessThanOrEqual(400)
  })

  it('holds a column that would fall under its floor and shares what is left among the rest', () => {
    const shown: GitColumnName[] = ['refs', 'changes', 'sha', 'when']
    const saved: GitColumns = { refs: 220, changes: 150, author: 130, sha: 70, when: 60 }
    const fitted = fittedColumns(saved, shown, 213)
    expect(fitted.sha).toBe(GIT_COLUMNS.sha.min)
    expect(fitted.when).toBe(GIT_COLUMNS.when.min)
    expect(fitted.changes).toBe(GIT_COLUMNS.changes.min)
    expect(fitted.refs).toBe(73)
    expect(widthOf(fitted, shown)).toBe(213)
  })

  it('never rounds a column up, because the pixel it gains is the pixel the row overflows by', () => {
    const saved: GitColumns = { refs: 220, changes: 150, author: 130, sha: 70, when: 60 }
    for (let room = FLOORS; room <= 640; room++) {
      expect(widthOf(fittedColumns(saved, ALL, room), ALL)).toBeLessThanOrEqual(room)
    }
  })

  it('leaves the saved widths untouched, so a wider window brings them straight back', () => {
    const saved: GitColumns = { refs: 220, changes: 150, author: 130, sha: 70, when: 60 }
    fittedColumns(saved, ALL, 240)
    expect(saved).toEqual({ refs: 220, changes: 150, author: 130, sha: 70, when: 60 })
    const wide = columnRoom(tableFor(900, 5), GRAPH)
    expect(fittedColumns(saved, wide.shown, wide.room)).toEqual(saved)
  })

  it('keeps a column that is off screen at its saved width, ready for its turn', () => {
    const saved: GitColumns = { refs: 220, changes: 150, author: 130, sha: 70, when: 60 }
    expect(fittedColumns(saved, ['refs', 'sha', 'when'], 400).author).toBe(130)
  })
})

describe('columnCeiling: how far one column goes before another is pushed out', () => {
  it('offers whatever the other columns on screen are not holding', () => {
    expect(columnCeiling('refs', LAID, ALL, 600)).toBe(600 - (128 + 96 + 56 + 48))
  })

  it('never offers more than the column itself allows', () => {
    expect(columnCeiling('when', LAID, ALL, 9999)).toBe(GIT_COLUMNS.when.max)
  })

  it('never offers less than the column can be read at', () => {
    expect(columnCeiling('refs', LAID, ALL, 100)).toBe(GIT_COLUMNS.refs.min)
  })

  it('holds the table to its width: a column dragged to its ceiling still fits beside the rest', () => {
    for (const table of [900, 1100, 1400, 1600]) {
      const room = columnRoom(table, GRAPH)
      for (const name of room.shown) {
        const pulled = { ...LAID, [name]: columnCeiling(name, LAID, room.shown, room.room) }
        expect(widthOf(pulled, room.shown)).toBeLessThanOrEqual(room.room)
      }
    }
  })
})
