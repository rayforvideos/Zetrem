import { GIT_COLUMNS, GIT_COLUMN_STEP } from '@/shared/config/theme'
import type { GitColumnName, GitColumns } from './columns.types'

// A width is held inside the column's own range, so no drag and no saved file can
// squeeze a cell down to nothing or let one column swallow the table.
export function clampColumn(name: GitColumnName, px: number): number {
  const bounds = GIT_COLUMNS[name]
  if (!Number.isFinite(px)) return bounds.width
  return Math.min(bounds.max, Math.max(bounds.min, Math.round(px)))
}

// Which way the hand travels to widen a column. The refs column is the only one
// left of the commit message, so its grip is its right edge and moves out with it.
// Every other grip is a left edge, with the message column giving up the room
// behind it, so those columns grow as their grip is pulled left.
export function columnPull(name: GitColumnName): 1 | -1 {
  return name === 'refs' ? 1 : -1
}

export function draggedColumn(name: GitColumnName, startWidth: number, deltaX: number): number {
  return clampColumn(name, startWidth + deltaX * columnPull(name))
}

// The arrow keys move the grip, not the width, so they read the same as the drag
// does: the mark on screen goes where the arrow points either way.
export function nudgedColumn(name: GitColumnName, width: number, key: string): number | null {
  switch (key) {
    case 'ArrowLeft':
      return clampColumn(name, width - GIT_COLUMN_STEP * columnPull(name))
    case 'ArrowRight':
      return clampColumn(name, width + GIT_COLUMN_STEP * columnPull(name))
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
