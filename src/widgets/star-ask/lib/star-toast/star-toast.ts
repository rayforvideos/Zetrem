import { createElement } from 'react'
import { toast } from 'sonner'
import { StarCard } from '../../ui/StarCard/StarCard'
import { STAR_REPO_URL } from '../star-due/star-due'

const STAR_TOAST_MS = 15_000

// The ask is a card in the corner, not a dialog over the work: gone on its own
// if ignored. window.open lands in the main process, which hands https links
// to the browser.
export function askForStar(on: { star(): void }): void {
  const id = toast.custom(
    () =>
      createElement(StarCard, {
        onStar: () => {
          window.open(STAR_REPO_URL, '_blank', 'noopener')
          on.star()
          toast.dismiss(id)
        },
        onLater: () => toast.dismiss(id),
      }),
    { duration: STAR_TOAST_MS },
  )
}
