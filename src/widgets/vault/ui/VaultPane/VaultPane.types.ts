import type { ReactNode } from 'react'
import type { VaultFolder, VaultHit, VaultNote, VaultNoteSummary } from '@/entities/vault'

export type VaultFilter = 'all' | 'agent' | 'person'

export type VaultPaneProps = {
  folders: VaultFolder[]
  // Every note, newest change first.
  notes: VaultNoteSummary[]
  // Search results while the query has words; null shows the notes instead.
  hits: VaultHit[] | null
  query: string
  filter: VaultFilter
  tag: string | null
  open: VaultNote | null
  // Notes whose body links to the open note.
  backlinks: VaultNoteSummary[]
  loading: boolean
  editing: boolean
  // The note was just created and its title is still the placeholder.
  fresh: boolean
  guideOpen: boolean
  // When the last autosave landed during this edit; null before the first.
  savedAtMs: number | null
  nowMs: number
  onQuery(query: string): void
  onFilter(filter: VaultFilter): void
  onTag(tag: string | null): void
  onOpen(id: string): void
  onOpenTitle(title: string): void
  onOpenGuide(): void
  onCreate(folder: string | null): void
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
