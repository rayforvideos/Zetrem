import type { LibraryHit, LibraryNote, LibraryNoteSummary } from '@/entities/library/model/note'

export type IndexedNote = LibraryNote & { hash: string }

export type LibraryIndex = {
  sync(notes: IndexedNote[]): void
  search(query: string, limit?: number): LibraryHit[]
  recent(limit?: number): LibraryNoteSummary[]
  backlinks(title: string): LibraryNoteSummary[]
  close(): void
}
