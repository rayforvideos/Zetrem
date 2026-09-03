import type { GIT_COLUMNS } from '@/shared/config/theme'

// A column of the history table a person can resize. The graph is not one of
// them: its width is however many lanes the commits need.
export type GitColumnName = keyof typeof GIT_COLUMNS

// Every resizable column's width in px. The same shape settings keeps on disk.
export type GitColumns = Record<GitColumnName, number>
