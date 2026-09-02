import type { GitReply } from '../../shell/git-run/git-run.types'

export type ReviewDeps = {
  here(): Promise<string | null>
  git(args: string[], cwd: string): Promise<GitReply>
}
