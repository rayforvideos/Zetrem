import type { NoteSource } from '@/entities/vault/model/note'

export type NotePatch = { title?: string; tags?: string[]; source?: NoteSource }
