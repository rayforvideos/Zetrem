import type { ReactNode } from 'react'
import type { VaultFolder, VaultNote, VaultNoteSummary } from '@/entities/vault'

export type VaultPaneProps = {
  folders: VaultFolder[]
  notes: VaultNoteSummary[]
  open: VaultNote | null
  loading: boolean
  editing: boolean
  fresh: boolean
  guideOpen: boolean
  onOpen(id: string): void
  onOpenTitle(title: string): void
  onRemove(id: string): void
  onStartEdit(): void
  onStopEdit(): void
  onSave(id: string, text: string): void
  onRename(id: string, title: string): Promise<boolean>
  onCreate(folder: string, title: string): void
  onAddFolder(name: string): void
  onRenameFolder(name: string, next: string): void
  onRemoveFolder(name: string): void
  onOpenGuide(): void
  sidebar: ReactNode
}
