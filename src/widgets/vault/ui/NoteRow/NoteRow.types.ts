import type { VaultNoteSummary } from '@/entities/vault'

export type NoteRowProps = {
  note: VaultNoteSummary
  // The search snippet, shown in place of the summary while searching.
  snippet: string | null
  open: boolean
  nowMs: number
  onOpen(id: string): void
}
