import type { GitReply } from '../../shell/git-run/git-run.types'

// Which side of a change a diff should show: what is staged, what is not
// yet, or a file git does not know at all.
export type DiffSide = 'staged' | 'unstaged' | 'untracked'

export type GitDeps = {
  here(): Promise<string | null>
  git(args: string[], cwd: string): Promise<GitReply>
  // Reads one file of the project, for drawing an untracked file as a diff.
  read(path: string): Promise<string | null>
  // Reads bytes: the working copy of a path when ref is empty, or the blob a
  // ref holds, for showing an image instead of a byte diff.
  blob(path: string, ref: string, cwd: string): Promise<Buffer | null>
}
