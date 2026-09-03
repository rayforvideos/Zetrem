import { useState } from 'react'
import { resetColumn, withColumn } from '../lib/columns/columns'
import type { GitColumnName, GitColumns } from '../lib/columns/columns.types'

type Sizing = {
  columns: GitColumns
  resize(name: GitColumnName, px: number): void
  commit(name: GitColumnName, px: number): void
  reset(name: GitColumnName): void
}

// A drag lives in local state and only reaches settings when the hand lets go:
// a pointer move fires per frame, and each save is a write to disk.
export function useGitColumns(saved: GitColumns, save: (next: GitColumns) => void): Sizing {
  const [dragging, setDragging] = useState<GitColumns | null>(null)
  const columns = dragging ?? saved

  return {
    columns,
    resize(name, px) {
      setDragging(withColumn(columns, name, px))
    },
    commit(name, px) {
      setDragging(null)
      save(withColumn(columns, name, px))
    },
    reset(name) {
      setDragging(null)
      save(resetColumn(columns, name))
    },
  }
}
