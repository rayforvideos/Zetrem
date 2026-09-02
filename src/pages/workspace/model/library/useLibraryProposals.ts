import { useCallback, useEffect, useState } from 'react'
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

  useEffect(() => window.desk.onLibraryProposed(reload), [reload])

  // Accepting one writes a note, and a note written elsewhere may have been
  // one of these: both are a reason to ask again.
  useEffect(() => window.desk.onLibraryChanged(reload), [reload])

  const accept = useCallback(
    (id: string): void => {
      void window.desk
        .acceptLibraryProposal(id)
        .then(() => reload())
        .catch(() => undefined)
    },
    [reload],
  )

  const dismiss = useCallback(
    (id: string): void => {
      void window.desk
        .dismissLibraryProposal(id)
        .then(() => reload())
        .catch(() => undefined)
    },
    [reload],
  )

  return { proposals, accept, dismiss }
}
