import type { VaultNoteSummary } from '../../model/note'

export function unseenSince(notes: VaultNoteSummary[], seenAtMs: number): boolean {
  return notes.some((one) => one.updatedAtMs > seenAtMs)
}
