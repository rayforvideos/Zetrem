import type { LibraryNote } from '@/entities/library'

export type NoteEditorProps = {
  note: LibraryNote
  guide: boolean
  fresh: boolean
  onChange(body: string): void
  onTitle(title: string): Promise<boolean>
  onTags(tags: string[]): void
}
