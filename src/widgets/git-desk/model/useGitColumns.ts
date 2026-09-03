import { useMemo, useState } from 'react'
import { columnCeiling, fittedColumns, resetColumn, withColumn } from '../lib/columns/columns'
import type { ColumnRoom, GitColumnName, GitColumns } from '../lib/columns/columns.types'

type Sizing = {
  columns: GitColumns
  shows(name: GitColumnName): boolean
  ceiling(name: GitColumnName): number
  resize(name: GitColumnName, px: number): void
  commit(name: GitColumnName, px: number): void
  reset(name: GitColumnName): void
}

// A drag lives in local state and only reaches settings when the hand lets go:
// a pointer move fires per frame, and each save is a write to disk.
//
// What the table draws is the saved widths pulled into the room the window leaves
// them, but what it saves is the saved widths themselves. That way a drag in a
// narrow window sets only the column it was aimed at, and the others come back at
// their own width the moment there is room for them again.
export function useGitColumns(
  saved: GitColumns,
  save: (next: GitColumns) => void,
  room: ColumnRoom,
): Sizing {
  const [dragging, setDragging] = useState<GitColumns | null>(null)
  const held = dragging ?? saved
  const columns = useMemo(() => fittedColumns(held, room.shown, room.room), [held, room])

  return {
    columns,
    shows: (name) => room.shown.includes(name),
    ceiling: (name) => columnCeiling(name, columns, room.shown, room.room),
    resize(name, px) {
      setDragging(withColumn(held, name, px))
    },
    commit(name, px) {
      setDragging(null)
      save(withColumn(held, name, px))
    },
    reset(name) {
      setDragging(null)
      save(resetColumn(held, name))
    },
  }
}
