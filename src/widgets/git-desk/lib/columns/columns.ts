import { GIT_COLUMNS, GIT_COLUMN_GIVEWAY, GIT_COLUMN_STEP, GIT_TABLE } from '@/shared/config/theme'
import type { ColumnRoom, GitColumnName, GitColumns } from './columns.types'

// The columns left to right, the order the table draws them in.
const NAMES = Object.keys(GIT_COLUMNS) as GitColumnName[]

// A width is held inside the column's own range, so no drag and no saved file can
// squeeze a cell down to nothing or let one column swallow the table.
export function clampColumn(name: GitColumnName, px: number): number {
  const bounds = GIT_COLUMNS[name]
  if (!Number.isFinite(px)) return bounds.width
  return Math.min(bounds.max, Math.max(bounds.min, Math.round(px)))
}

// The same, under the ceiling the table has room for today. The floor outranks the
// ceiling: a cell squeezed to nothing reads as a fault, a narrow one only as narrow.
export function heldColumn(name: GitColumnName, px: number, ceiling: number): number {
  return Math.max(GIT_COLUMNS[name].min, Math.min(ceiling, clampColumn(name, px)))
}

// Which way the hand travels to widen a column. The refs column is the only one
// left of the commit message, so its grip is its right edge and moves out with it.
// Every other grip is a left edge, with the message column giving up the room
// behind it, so those columns grow as their grip is pulled left.
export function columnPull(name: GitColumnName): 1 | -1 {
  return name === 'refs' ? 1 : -1
}

export function draggedColumn(
  name: GitColumnName,
  startWidth: number,
  deltaX: number,
  ceiling: number,
): number {
  return heldColumn(name, startWidth + deltaX * columnPull(name), ceiling)
}

// The arrow keys move the grip, not the width, so they read the same as the drag
// does: the mark on screen goes where the arrow points either way.
export function nudgedColumn(
  name: GitColumnName,
  width: number,
  key: string,
  ceiling: number,
): number | null {
  switch (key) {
    case 'ArrowLeft':
      return heldColumn(name, width - GIT_COLUMN_STEP * columnPull(name), ceiling)
    case 'ArrowRight':
      return heldColumn(name, width + GIT_COLUMN_STEP * columnPull(name), ceiling)
    default:
      return null
  }
}

export function withColumn(columns: GitColumns, name: GitColumnName, px: number): GitColumns {
  return { ...columns, [name]: clampColumn(name, px) }
}

export function resetColumn(columns: GitColumns, name: GitColumnName): GitColumns {
  return { ...columns, [name]: GIT_COLUMNS[name].width }
}

// The pixels the resizable columns have between them: the table, less its own
// padding, the seams, the graph's lanes, the scrollbar's gutter and the floor the
// commit message keeps. A row draws the graph and the message besides the columns
// named here, so there is one seam more than there are columns.
function sharedRoom(table: number, graph: number, columns: number): number {
  const frame =
    GIT_TABLE.pad * 2 + (columns + 1) * GIT_TABLE.gap + GIT_TABLE.gutter + graph + GIT_TABLE.message
  return Math.max(0, Math.floor(table - frame))
}

function floorsOf(names: readonly GitColumnName[]): number {
  return names.reduce((sum, name) => sum + GIT_COLUMNS[name].min, 0)
}

// What this table has to give. A column steps aside only once even the floors of
// the ones ahead of it will not fit, so a narrowing window clips what a cell holds
// long before it drops the cell. Before the first measurement there is nothing to
// fit against, so every column is offered the whole of its saved width.
export function columnRoom(table: number, graph: number): ColumnRoom {
  if (!Number.isFinite(table) || table <= 0) {
    return { shown: [...NAMES], room: Number.POSITIVE_INFINITY }
  }
  let shown = [...NAMES]
  for (const gone of GIT_COLUMN_GIVEWAY) {
    if (floorsOf(shown) <= sharedRoom(table, graph, shown.length)) break
    shown = shown.filter((name) => name !== gone)
  }
  return { shown, room: sharedRoom(table, graph, shown.length) }
}

// The widths as the table can draw them today. When the saved widths ask for more
// room than there is, every column gives up the same share of itself rather than
// the right-hand ones being pushed off the edge; one that would fall under its own
// floor holds there and the rest share what is left over. The saved numbers are
// never touched, so widening the window brings them straight back.
export function fittedColumns(
  saved: GitColumns,
  shown: readonly GitColumnName[],
  room: number,
): GitColumns {
  const held = Object.fromEntries(
    NAMES.map((name) => [name, clampColumn(name, saved[name])]),
  ) as GitColumns
  const fitted = { ...held }
  let free = [...shown]
  let left = room
  while (free.length > 0) {
    const total = free.reduce((sum, name) => sum + held[name], 0)
    if (total <= left) break
    const share = total === 0 ? 0 : left / total
    const pinned = free.filter((name) => held[name] * share < GIT_COLUMNS[name].min)
    if (pinned.length === 0) {
      // Rounded down, never up: a pixel gained here is a pixel the row overflows by.
      for (const name of free) fitted[name] = Math.floor(held[name] * share)
      break
    }
    for (const name of pinned) {
      fitted[name] = GIT_COLUMNS[name].min
      left -= GIT_COLUMNS[name].min
    }
    free = free.filter((name) => !pinned.includes(name))
  }
  return fitted
}

// The widest this column may be drawn: the room, less what the other columns on
// screen are holding. Past that the message column would be pushed under its floor
// and the columns behind it off the right edge, so a drag stops here.
export function columnCeiling(
  name: GitColumnName,
  columns: GitColumns,
  shown: readonly GitColumnName[],
  room: number,
): number {
  const others = shown.reduce((sum, one) => (one === name ? sum : sum + columns[one]), 0)
  return Math.max(GIT_COLUMNS[name].min, Math.min(GIT_COLUMNS[name].max, room - others))
}
