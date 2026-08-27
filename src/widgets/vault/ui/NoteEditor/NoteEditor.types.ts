import type { VaultNote } from '@/entities/vault'

export type NoteEditorProps = {
  note: VaultNote
  guide: boolean
  fresh: boolean
  onChange(body: string): void
  onTitle(title: string): Promise<boolean>
  onTags(tags: string[]): void
}
