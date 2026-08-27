import type { LibraryNoteSummary } from '../../model/note'

export function unseenSince(notes: LibraryNoteSummary[], seenAtMs: number): boolean {
  return notes.some((one) => one.updatedAtMs > seenAtMs)
}
