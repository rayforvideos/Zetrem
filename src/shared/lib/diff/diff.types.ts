export type DiffTone = 'added' | 'removed' | 'meta' | 'plain'

export type DiffRow = { key: string; text: string; tone: DiffTone }
