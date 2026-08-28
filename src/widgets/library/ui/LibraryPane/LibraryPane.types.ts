import type { ReactNode } from 'react'
import type { LibraryFolder, LibraryHit, LibraryNote, LibraryNoteSummary } from '@/entities/library'

export type LibraryPaneProps = {
  folders: LibraryFolder[]
  // Every note, newest change first.
  notes: LibraryNoteSummary[]
  // Search results while the query has words; null shows the notes instead.
  hits: LibraryHit[] | null
  query: string
  tag: string | null
  open: LibraryNote | null
  // Notes whose body links to the open note.
  backlinks: LibraryNoteSummary[]
  loading: boolean
  editing: boolean
  // The note was just created and its title is still the placeholder.
  fresh: boolean
  // When the last autosave landed during this edit; null before the first.
  savedAtMs: number | null
  nowMs: number
  onQuery(query: string): void
  onTag(tag: string | null): void
  onOpen(id: string): void
  onOpenTitle(title: string): void
  onCreate(folder: string): void
  onRemove(id: string): void
  onStartEdit(): void
  onStopEdit(): void
  onSave(id: string, body: string): void
  onRename(id: string, title: string): Promise<boolean>
  onTags(id: string, tags: string[]): void
  onAddFolder(name: string): void
  onRenameFolder(name: string, next: string): void
  onRemoveFolder(name: string): void
  sidebar: ReactNode
}
