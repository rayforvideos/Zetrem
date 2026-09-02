import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { leadOf } from '@/entities/library'
import { Markdown } from '@/shared/markdown/Markdown/Markdown'
import { Button } from '@/shared/ui/button'
import type { ProposalRowProps } from './ProposalRow.types'

// One thing an agent would like to add. It opens to its whole body, because a
// person deciding on a note should be able to read the note.
export function ProposalRow({ proposal, onAccept, onDismiss }: ProposalRowProps) {
  const [open, setOpen] = useState(false)
  const lead = leadOf(proposal.body)

  return (
    <li
      data-proposal={proposal.id}
      className="flex flex-col gap-2 rounded-xl border border-border bg-card/60 px-3 py-2.5"
    >
      <Button
        variant="ghost"
        size="bare"
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
        className="h-auto w-full min-w-0 flex-col items-stretch gap-1 rounded-lg text-left"
      >
        <span className="truncate text-sm font-medium">{proposal.title}</span>
        {!open && lead.length > 0 && (
          <span className="w-full truncate text-xs leading-snug text-muted-foreground">{lead}</span>
        )}
      </Button>

      {open && (
        <Markdown text={proposal.body} className="text-sm leading-relaxed text-muted-foreground" />
      )}

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
        <Button size="xs" onClick={() => onAccept(proposal.id)} className="rounded-full">
          {t`Accept`}
        </Button>
        <Button
          size="xs"
          variant="secondary"
          onClick={() => onDismiss(proposal.id)}
          className="rounded-full"
        >
          {t`Dismiss`}
        </Button>
      </div>
    </li>
  )
}
