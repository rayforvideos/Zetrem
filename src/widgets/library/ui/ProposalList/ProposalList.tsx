import { t } from '@lingui/core/macro'
import { ProposalRow } from '../ProposalRow/ProposalRow'
import type { ProposalListProps } from './ProposalList.types'

// What agents have asked to add, above the library itself: none of it is in
// the library yet, and the section is gone the moment nothing is waiting.
export function ProposalList({ proposals, onAccept, onDismiss }: ProposalListProps) {
  if (proposals.length === 0) return null

  return (
    <section data-proposals className="flex flex-none flex-col gap-2 pb-6">
      <h2 className="flex items-baseline gap-1.5 text-xs tracking-[0.08em] text-muted-foreground">
        {t`Waiting for you`}
        <span data-proposal-count className="tabular-nums text-muted-foreground/60">
          {proposals.length}
        </span>
      </h2>
      <ul className="flex flex-col gap-2">
        {proposals.map((proposal) => (
          <ProposalRow
            key={proposal.id}
            proposal={proposal}
            onAccept={onAccept}
            onDismiss={onDismiss}
          />
        ))}
      </ul>
    </section>
  )
}
