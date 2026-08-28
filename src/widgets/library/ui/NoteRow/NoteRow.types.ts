import type { LibraryNoteSummary } from '@/entities/library'

export type NoteRowProps = {
  note: LibraryNoteSummary
  // The search snippet, shown in place of the summary while searching.
  snippet: string | null
  open: boolean
  nowMs: number
  onOpen(id: string): void
}
