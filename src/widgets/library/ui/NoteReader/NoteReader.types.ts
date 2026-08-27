import type { LibraryNote, LibraryNoteSummary } from '@/entities/library'

export type NoteReaderProps = {
  note: LibraryNote
  titles: ReadonlySet<string>
  backlinks: LibraryNoteSummary[]
  editing: boolean
  guide: boolean
  fresh: boolean
  savedAtMs: number | null
  nowMs: number
  onOpen(id: string): void
  onOpenTitle(title: string): void
  onRemove(id: string): void
  onStartEdit(): void
  onStopEdit(): void
  onSave(id: string, body: string): void
  onRename(id: string, title: string): Promise<boolean>
  onTags(id: string, tags: string[]): void
}
