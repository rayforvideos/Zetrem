import { t } from '@lingui/core/macro'
import type { Why } from '@/shared/lib/outcome/outcome.types'
import type { Landed, Undone } from './review.types'

export { diffRows } from '@/shared/lib/diff/diff'

export function rollbackTitle(landed: Landed): string {
  return landed === 'branch'
    ? t`Throw this teammate's work away?`
    : t`Undo the work of this teammate that was already merged?`
}

export function rollbackWarning(landed: Landed): string {
  return landed === 'branch'
    ? t`This work never reached the working tree. Zetrem deletes the branch it is on and the worktree it was written in, and nothing of it can be brought back.`
    : t`This work is already in the working tree. Zetrem adds a commit that undoes the merge, so the history stays and the files go back to what they were.`
}

export function rollbackDone(state: Undone): string {
  return state === 'dropped'
    ? t`The branch and its worktree are gone.`
    : t`A commit undoing that merge is on the tree now.`
}

export function emptyDiffNote(): string {
  return t`This teammate changed no files.`
}

// The bridge itself did not answer, so nothing was learned about the work
// either way. Saying git said something would be putting words in its mouth.
export function askTrouble(): string {
  return t`Zetrem could not ask Git about this work.`
}

// What could not be found was named by the branch it lives on, a
// worktree-agent-<id> nobody chose and nobody reads. The teammate has a name,
// and that is what the reader knows this work by.
export function troubleLine(why: Why, who: string): string {
  if (why.code === 'refused') return t`This teammate has no branch Zetrem can look up.`
  if (why.code === 'cli') return t`Git said: ${why.said}`
  return t`Zetrem can no longer find the work ${who} did.`
}
