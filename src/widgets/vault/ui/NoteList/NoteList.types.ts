import type { VaultFolder, VaultHit, VaultNoteSummary } from '@/entities/vault'
import type { VaultFilter } from '../VaultPane/VaultPane.types'

export type NoteListProps = {
  folders: VaultFolder[]
  notes: VaultNoteSummary[]
  hits: VaultHit[] | null
  query: string
  filter: VaultFilter
  tag: string | null
  openId: string | null
  nowMs: number
  onQuery(query: string): void
  onFilter(filter: VaultFilter): void
  onTag(tag: string | null): void
  onOpen(id: string): void
  onCreate(folder: string | null): void
  onAddFolder(name: string): void
  onRenameFolder(name: string, next: string): void
  onRemoveFolder(name: string): void
}
