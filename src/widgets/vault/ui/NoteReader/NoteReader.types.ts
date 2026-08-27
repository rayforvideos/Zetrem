import type { VaultNote, VaultNoteSummary } from '@/entities/vault'

export type NoteReaderProps = {
  note: VaultNote
  titles: ReadonlySet<string>
  backlinks: VaultNoteSummary[]
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
