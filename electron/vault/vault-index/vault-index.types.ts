import type { VaultHit, VaultNote, VaultNoteSummary } from '@/entities/vault/model/note'

export type IndexedNote = VaultNote & { hash: string }

export type VaultIndex = {
  sync(notes: IndexedNote[]): void
  search(query: string, limit?: number): VaultHit[]
  recent(limit?: number): VaultNoteSummary[]
  backlinks(title: string): VaultNoteSummary[]
  close(): void
}
