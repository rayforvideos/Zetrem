import { useCallback, useEffect, useRef, useState } from 'react'
import { t } from '@lingui/core/macro'
import { toast } from 'sonner'
import type { LibraryProposal } from '@/entities/library'
import { begin, cancel, expire, pendingDismiss } from '@/entities/library'

// How long a dismissed proposal waits, hidden, before main is told to drop
// it — long enough for the toast's Undo to still mean something.
const DISMISS_DELAY_MS = 5000

// What agents have asked to add to this project's library. A proposal belongs
// to the project, not to a chat, so it is still here after a chat switch and
// waits until the person answers it.
export function useLibraryProposals(project: string | null) {
  const [proposals, setProposals] = useState<LibraryProposal[]>([])
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(new Set())
  // The token bookkeeping is not itself state a render depends on: hiddenIds
  // is what decides what is drawn, this is only what decides whether a timer
  // that later fires still owns the delete.
  const pending = useRef(pendingDismiss())

  const reload = useCallback((): void => {
    void window.desk
      .listLibraryProposals()
      .then(setProposals)
      .catch(() => undefined)
  }, [])

  // Another project is another library, so nothing carries over: a dismiss
  // still waiting on the project being left belongs to a library this screen
  // will not touch again.
  useEffect(() => {
    setProposals([])
    setHiddenIds(new Set())
    pending.current = pendingDismiss()
    reload()
  }, [project, reload])

  // Main pushes this after every accept and dismiss, whichever the outcome,
  // so this alone keeps the list current — reading it again on every library
  // edit elsewhere would reload it for changes that were never a proposal.
  useEffect(() => window.desk.onLibraryProposed(reload), [reload])

  const accept = useCallback(
    (id: string): void => {
      const title = proposals.find((one) => one.id === id)?.title ?? ''
      void window.desk
        .acceptLibraryProposal(id)
        .then((note) => {
          // Accept already pushes 'library:proposed', which reloads the list;
          // nothing failed the proposal stays right where it was.
          if (note === null) {
            toast.error(t`Could not file "${title}". Check its title and folder in the library.`)
          }
        })
        .catch(() => undefined)
    },
    [proposals],
  )

  const show = useCallback((id: string): void => {
    setHiddenIds((was) => {
      if (!was.has(id)) return was
      const next = new Set(was)
      next.delete(id)
      return next
    })
  }, [])

  const dismiss = useCallback(
    (id: string): void => {
      const title = proposals.find((one) => one.id === id)?.title ?? ''
      const token = begin(pending.current, id)
      setHiddenIds((was) => new Set(was).add(id))
      toast(t`Dismissed "${title}"`, {
        action: {
          label: t`Undo`,
          onClick: () => {
            if (cancel(pending.current, id)) show(id)
          },
        },
      })
      setTimeout(() => {
        if (expire(pending.current, id, token)) {
          void window.desk.dismissLibraryProposal(id).catch(() => undefined)
        }
      }, DISMISS_DELAY_MS)
    },
    [proposals, show],
  )

  const visible = proposals.filter((one) => !hiddenIds.has(one.id))

  return { proposals: visible, accept, dismiss }
}
