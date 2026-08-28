import { t } from '@lingui/core/macro'
import { toast } from 'sonner'
import { STAR_REPO_URL } from '../star-due/star-due'

const STAR_TOAST_MS = 15_000

// The ask is a toast in the corner, not a dialog over the work: one line, two
// choices, gone on its own if ignored. window.open lands in the main process,
// which hands https links to the browser.
export function askForStar(on: { star(): void }): void {
  toast(t`Is Zetrem earning its keep?`, {
    description: t`A GitHub star helps others find it, and keeps us going.`,
    duration: STAR_TOAST_MS,
    action: {
      label: t`Star it`,
      onClick: () => {
        window.open(STAR_REPO_URL, '_blank', 'noopener')
        on.star()
      },
    },
    cancel: { label: t`Not now`, onClick: () => undefined },
  })
}
