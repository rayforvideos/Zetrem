import type { LibraryProposal } from '@/entities/library'

export type ProposalRowProps = {
  proposal: LibraryProposal
  onAccept(id: string): void
  onDismiss(id: string): void
}
