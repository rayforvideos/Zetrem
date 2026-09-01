// Where a teammate's work stands when it is looked at, and what a rollback
// did with it. The words the report shows turn on these two.
export type Landed = 'branch' | 'merged'

export type Undone = 'dropped' | 'reverted'

export type { DiffRow, DiffTone } from '@/shared/lib/diff/diff.types'
