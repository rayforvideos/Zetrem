import type { LibraryProposal } from '@/entities/library'

export type ProposalListProps = {
  // Oldest first. Nothing is drawn when it is empty.
  proposals: LibraryProposal[]
  onAccept(id: string): void
  onDismiss(id: string): void
}
