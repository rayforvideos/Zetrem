import type { NoteRow } from '../library-db/library-db.types'

export type HitRow = NoteRow & { snippet: string }
