import type { LibraryFolder, LibraryHit, LibraryNoteSummary } from '@/entities/library'

export type NoteListProps = {
  folders: LibraryFolder[]
  notes: LibraryNoteSummary[]
  hits: LibraryHit[] | null
  query: string
  tag: string | null
  openId: string | null
  nowMs: number
  // The header asked for a new folder; the list shows the field and says when it is done.
  naming: boolean
  onNamed(): void
  onQuery(query: string): void
  onTag(tag: string | null): void
  onOpen(id: string): void
  onCreate(folder: string): void
  onAddFolder(name: string): void
  onRenameFolder(name: string, next: string): void
  onRemoveFolder(name: string): void
}
