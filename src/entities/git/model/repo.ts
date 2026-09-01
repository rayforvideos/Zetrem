// One changed path in the project repo. `sign` is the letter the list shows
// (M, A, D, R, ?), taken from the staged side when both sides changed.
export type GitFile = { path: string; staged: boolean; unstaged: boolean; sign: string }

export type GitStatus = {
  branch: string
  upstream: string | null
  ahead: number
  behind: number
  files: GitFile[]
}

export type GitBranch = { name: string; current: boolean }

export type GitCommitLine = { sha: string; subject: string }

// One commit of the graph view. `at` is epoch milliseconds; `refs` are the
// names sitting on the commit (branches, remotes, tags), `head` whether the
// checked-out line ends here.
export type GraphCommit = {
  sha: string
  short: string
  parents: string[]
  refs: string[]
  head: boolean
  author: string
  at: number
  subject: string
  stat: GitStat
}

// One path a commit touched, with the letter git gave the change.
export type ShownFile = { path: string; sign: string }

// How much one commit changed, for the graph's changes column.
export type GitStat = { files: number; adds: number; dels: number }
