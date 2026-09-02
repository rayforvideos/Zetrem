import type { LibraryProposal } from '@/entities/library'

export type ProposalRowProps = {
  proposal: LibraryProposal
  chatTitleOf(session: string): string | null
  onAccept(id: string): void
  onDismiss(id: string): void
}
