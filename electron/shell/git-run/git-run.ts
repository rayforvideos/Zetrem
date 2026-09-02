import { execFile } from 'node:child_process'
import type { GitReply } from './git-run.types'

const GIT_TIMEOUT_MS = 60_000
const GIT_BUFFER_MAX = 32 * 1024 * 1024

// The one place main runs git. Everything that reads a repository - the review,
// the desk, the worktree links - goes through here, so the timeout, the buffer
// cap and the "a failure is a code, not a throw" rule are decided once.
export function runGit(args: string[], cwd: string): Promise<GitReply> {
  return new Promise((resolve) => {
    execFile(
      'git',
      args,
      { cwd, timeout: GIT_TIMEOUT_MS, maxBuffer: GIT_BUFFER_MAX, windowsHide: true },
      (trouble, stdout, stderr) => {
        if (trouble === null) {
          resolve({ code: 0, stdout, stderr })
          return
        }
        const code = typeof trouble.code === 'number' ? trouble.code : 1
        resolve({ code, stdout, stderr: stderr.length > 0 ? stderr : trouble.message })
      },
    )
  })
}
