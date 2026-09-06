import { useCallback, useEffect, useRef, useState } from 'react'
import { t } from '@lingui/core/macro'
import { toast } from 'sonner'
import type { LibraryProposal } from '@/entities/library'
import { begin, cancel, expire, pendingDismiss, twinsOf, withoutTwins } from '@/entities/library'

// How long a dismissed proposal waits, hidden, before main is told to drop
// it — long enough for the toast's Undo to still mean something.
const DISMISS_DELAY_MS = 5000

// What agents have asked to add to this project's library. A proposal belongs
// to the project, not to a chat, so it is still here after a chat switch and
// waits until the person answers it.
export function useLibraryProposals(project: string | null, onOpenNote: (id: string) => void) {
  const [proposals, setProposals] = useState<LibraryProposal[]>([])
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(new Set())
  // The token bookkeeping is not itself state a render depends on: hiddenIds
  // is what decides what is drawn, this is only what decides whether a timer
  // that later fires still owns the delete.
  const pending = useRef(pendingDismiss())
  // An accept cannot be delayed the way a dismiss is: the note has to exist
  // before there is anything to link to. So Undo is a second move rather than
  // a cancelled first one, and this is what keeps it to a single move — once
  // the accept has been taken back, taking it back again would delete a note
  // the person may have rewritten since.
  const undoable = useRef(pendingDismiss())
  // The project the screen was on when a toast went up. A note id means one
  // note in one library, so an undo after a project switch must not reach for
  // the same id somewhere else.
  const shownProject = useRef<string | null>(project)

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
    undoable.current = pendingDismiss()
    shownProject.current = project
    reload()
  }, [project, reload])

  // Main pushes this after every accept and dismiss, whichever the outcome,
  // so this alone keeps the list current — reading it again on every library
  // edit elsewhere would reload it for changes that were never a proposal.
  useEffect(() => window.desk.onLibraryProposed(reload), [reload])

  // Accepting is the one answer that leaves something behind, so it is the one
  // that has to say so: which note it made, a way to it, and a way back out.
  const accept = useCallback(
    (id: string): void => {
      const asked = proposals.find((one) => one.id === id)
      if (asked === undefined) return
      const { title } = asked
      // Answering this card answers every card that says the same thing, or
      // the twins come back as their own suggestions the moment the list
      // reloads and the person has to refuse the same note again.
      const twins = twinsOf(proposals, id)
      const acceptedIn = shownProject.current
      void window.desk
        .acceptLibraryProposal(id)
        .then((note) => {
          // Accept already pushes 'library:proposed', which reloads the list;
          // nothing failed the proposal stays right where it was.
          if (note === null) {
            toast.error(t`Could not file "${title}". Check its title and folder in the library.`)
            return
          }
          for (const twin of twins) {
            void window.desk.dismissLibraryProposal(twin.id).catch(() => undefined)
          }
          const token = begin(undoable.current, note.id)
          toast(t`Filed to the library · ${note.title}`, {
            action: { label: t`Open`, onClick: () => onOpenNote(note.id) },
            cancel: {
              label: t`Undo`,
              onClick: () => {
                if (shownProject.current !== acceptedIn) {
                  toast(t`That note is in another project now; open it there to remove it.`)
                  return
                }
                if (!expire(undoable.current, note.id, token)) return
                // Both halves of the accept come back: the note it wrote goes,
                // and the suggestion returns to waiting under the id it had.
                void window.desk
                  .removeLibraryNote(note.id)
                  .then(() => window.desk.restoreLibraryProposal(asked))
                  .catch(() => undefined)
              },
            },
          })
        })
        .catch(() => undefined)
    },
    [proposals, onOpenNote],
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
      const twins = twinsOf(proposals, id)
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
          // The cards behind this one said the same thing, so they were
          // refused with it rather than left to be refused again.
          for (const twin of twins) {
            void window.desk.dismissLibraryProposal(twin.id).catch(() => undefined)
          }
        }
      }, DISMISS_DELAY_MS)
    },
    [proposals, show],
  )

  const visible = withoutTwins(proposals).filter((one) => !hiddenIds.has(one.id))

  return { proposals: visible, accept, dismiss }
}
