import { t } from '@lingui/core/macro'
import type { Why } from '@/shared/lib/outcome/outcome.types'
import type { DiffRow, DiffTone, Landed, Undone } from './review.types'

const HEADERS = ['diff --git', 'index ', '@@', 'new file', 'deleted file', 'similarity', 'rename ']

function toneOf(line: string): DiffTone {
  if (line.startsWith('+++') || line.startsWith('---')) return 'meta'
  if (HEADERS.some((head) => line.startsWith(head))) return 'meta'
  if (line.startsWith('+')) return 'added'
  if (line.startsWith('-')) return 'removed'
  return 'plain'
}

export function diffRows(diff: string): DiffRow[] {
  const lines = diff.split('\n')
  if (lines.at(-1) === '') lines.pop()
  return lines.map((text, at) => ({ key: `${at}`, text, tone: toneOf(text) }))
}

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

export function troubleLine(why: Why): string {
  if (why.code === 'refused') return t`This teammate has no branch Zetrem can look up.`
  if (why.code === 'cli') return t`Git said: ${why.said}`
  return t`Nothing of this work is left to find: ${why.said}`
}
