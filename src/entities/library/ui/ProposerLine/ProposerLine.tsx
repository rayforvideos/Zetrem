import { t } from '@lingui/core/macro'
import type { Proposer } from '../../lib/proposer/proposer.types'

// Who asked for a proposal and where, under its title. Shared by the card
// over the composer and the row in the library's own list, so the two never
// say it differently. Nothing is drawn when there is nothing to say.
export function ProposerLine({ proposer }: { proposer: Proposer | null }) {
  if (proposer === null) return null
  const { by, chatTitle } = proposer

  return (
    <p data-proposer className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      {by.length > 0 && <span>{t`From ${by}`}</span>}
      {chatTitle !== null && <span>{t`In "${chatTitle}"`}</span>}
    </p>
  )
}
