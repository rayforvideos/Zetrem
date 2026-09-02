import { t } from '@lingui/core/macro'
import { BookMarked } from 'lucide-react'
import { leadOf } from '@/entities/library'
import type { LibraryProposal } from '@/entities/library'
import { Markdown } from '@/shared/markdown/Markdown/Markdown'
import { Button } from '@/shared/ui/button'

// What an agent would like to add to the library, waiting for a word. It sits
// over the message box rather than in place of it: a suggestion never stops a
// person saying the next thing.
export function ProposalCard({
  proposal,
  waiting,
  onAccept,
  onDismiss,
}: {
  proposal: LibraryProposal
  // How many are waiting in all, this one included.
  waiting: number
  onAccept(id: string): void
  onDismiss(id: string): void
}) {
  const lead = leadOf(proposal.body)
  const behind = waiting - 1

  return (
    <div
      data-proposal={proposal.id}
      className="flex flex-none flex-col gap-3 rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <BookMarked aria-hidden className="size-3.5" />
        <span>{t`Suggested for the library`}</span>
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-base font-medium [overflow-wrap:anywhere]">{proposal.title}</p>
        {lead.length > 0 && (
          <Markdown text={lead} className="text-sm leading-relaxed text-muted-foreground" />
        )}
      </div>

      {(proposal.tags.length > 0 || proposal.folder.length > 0) && (
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {proposal.folder.length > 0 && (
            <span
              data-proposal-folder={proposal.folder}
              className="rounded-md bg-muted px-1.5 py-px"
            >
              {proposal.folder}
            </span>
          )}
          {proposal.tags.map((tag) => (
            <span key={tag} data-tag={tag} className="rounded-md bg-muted px-1.5 py-px">
              {tag}
            </span>
          ))}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => onAccept(proposal.id)} className="rounded-full">
          {t`Accept`}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onDismiss(proposal.id)}
          className="rounded-full"
        >
          {t`Dismiss`}
        </Button>
        {behind > 0 && (
          <span data-proposals-behind className="text-xs text-muted-foreground">
            {t`${behind} more waiting`}
          </span>
        )}
      </div>
    </div>
  )
}
