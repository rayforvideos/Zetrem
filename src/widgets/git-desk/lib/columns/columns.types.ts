import type { GIT_COLUMNS } from '@/shared/config/theme'

// A column of the history table a person can resize. The graph is not one of
// them: its width is however many lanes the commits need.
export type GitColumnName = keyof typeof GIT_COLUMNS

// Every resizable column's width in px. The same shape settings keeps on disk.
export type GitColumns = Record<GitColumnName, number>

// What a table of a given width has to give: the columns it can still draw, and
// the pixels those columns share between them.
export type ColumnRoom = {
  shown: GitColumnName[]
  room: number
}
