// Where a teammate's work stands when it is looked at, and what a rollback
// did with it. The words the report shows turn on these two.
export type Landed = 'branch' | 'merged'

export type Undone = 'dropped' | 'reverted'

export type DiffTone = 'added' | 'removed' | 'meta' | 'plain'

export type DiffRow = { key: string; text: string; tone: DiffTone }
