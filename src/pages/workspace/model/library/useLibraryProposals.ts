import { useCallback, useEffect, useState } from 'react'
import { t } from '@lingui/core/macro'
import { toast } from 'sonner'
import type { LibraryProposal } from '@/entities/library'

// What agents have asked to add to this project's library. A proposal belongs
// to the project, not to a chat, so it is still here after a chat switch and
// waits until the person answers it.
export function useLibraryProposals(project: string | null) {
  const [proposals, setProposals] = useState<LibraryProposal[]>([])

  const reload = useCallback((): void => {
    void window.desk
      .listLibraryProposals()
      .then(setProposals)
      .catch(() => undefined)
  }, [])

  // Another project is another library, so nothing carries over.
  useEffect(() => {
    setProposals([])
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

  const dismiss = useCallback((id: string): void => {
    void window.desk.dismissLibraryProposal(id).catch(() => undefined)
  }, [])

  return { proposals, accept, dismiss }
}
