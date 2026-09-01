import type { GitReply } from '../worktree-review/worktree-review.types'

// Which side of a change a diff should show: what is staged, what is not
// yet, or a file git does not know at all.
export type DiffSide = 'staged' | 'unstaged' | 'untracked'

export type GitDeps = {
  here(): Promise<string | null>
  git(args: string[], cwd: string): Promise<GitReply>
  // Reads one file of the project, for drawing an untracked file as a diff.
  read(path: string): Promise<string | null>
}
