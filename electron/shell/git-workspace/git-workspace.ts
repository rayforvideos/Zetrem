import { existsSync } from 'node:fs'
import { join } from 'node:path'

// A worktree can only be cut from a repository, and inside one that was cut
// already .git is a file naming the real one rather than a folder. Either
// shape answers yes; the scratch workspace and a plain folder answer no.
export function isGitWorkspace(dir: string): boolean {
  return existsSync(join(dir, '.git'))
}
