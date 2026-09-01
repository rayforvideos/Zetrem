import { execFile } from 'node:child_process'
import type { WorktreeDiff, WorktreeRollback } from '@/app/desk/desk.types'
import { lost, won } from '@/shared/lib/outcome/outcome'
import type { Outcome } from '@/shared/lib/outcome/outcome.types'
import { handle } from '../../ipc/ipc'
import { recallProject } from '../../store/project-memory/project-memory'
import type { GitReply, ReviewDeps } from './worktree-review.types'

const GIT_TIMEOUT_MS = 60_000
const GIT_BUFFER_MAX = 32 * 1024 * 1024

// The runtime names a worktree branch after its own agent id, which is hex.
// Anything else cannot name one, and would be a string this app made up.
const AGENT_ID = /^[0-9a-f]{6,}$/

function branchOf(agentId: string): string {
  return `worktree-agent-${agentId}`
}

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

const liveDeps: ReviewDeps = { here: recallProject, git: runGit }

// `git worktree list --porcelain` writes one block per worktree, the path
// first and the branch further down, blocks split by a blank line.
export function worktreePathOf(porcelain: string, branch: string): string | null {
  let path: string | null = null
  for (const line of porcelain.split('\n')) {
    const said = line.trim()
    if (said.startsWith('worktree ')) path = said.slice('worktree '.length)
    if (said === `branch refs/heads/${branch}`) return path
  }
  return null
}

async function branchIsOut(deps: ReviewDeps, cwd: string, branch: string): Promise<boolean> {
  const found = await deps.git(['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`], cwd)
  return found.code === 0
}

async function mergeOf(deps: ReviewDeps, cwd: string, branch: string): Promise<string | null> {
  const found = await deps.git(['log', '--merges', '--grep', branch, '-n', '1', '--format=%H'], cwd)
  if (found.code !== 0) return null
  const sha = found.stdout.trim()
  return sha.length === 0 ? null : sha
}

type Where = { cwd: string; branch: string }

// Where the answer has to be looked for, or the reason there is nowhere.
async function place(deps: ReviewDeps, agentId: string): Promise<Outcome<Where>> {
  if (!AGENT_ID.test(agentId)) return lost('refused', 'agent-id')
  const cwd = await deps.here()
  if (cwd === null) return lost('failed', 'no-project')
  return won({ cwd, branch: branchOf(agentId) })
}

function cliTrouble<T>(reply: GitReply): Outcome<T> {
  return lost<T>('cli', reply.stderr.trim())
}

export async function worktreeDiff(
  deps: ReviewDeps,
  agentId: string,
): Promise<Outcome<WorktreeDiff>> {
  const found = await place(deps, agentId)
  if (!found.ok) return found
  const { cwd, branch } = found.value

  if (await branchIsOut(deps, cwd, branch)) {
    const base = await deps.git(['merge-base', 'HEAD', branch], cwd)
    if (base.code !== 0) return cliTrouble(base)
    const shown = await deps.git(['diff', base.stdout.trim(), branch], cwd)
    if (shown.code !== 0) return cliTrouble(shown)
    return won({ state: 'branch', diff: shown.stdout })
  }

  const sha = await mergeOf(deps, cwd, branch)
  if (sha === null) return lost('failed', branch)
  const shown = await deps.git(['diff', `${sha}^1`, sha], cwd)
  if (shown.code !== 0) return cliTrouble(shown)
  return won({ state: 'merged', diff: shown.stdout })
}

export async function worktreeRollback(
  deps: ReviewDeps,
  agentId: string,
): Promise<Outcome<WorktreeRollback>> {
  const found = await place(deps, agentId)
  if (!found.ok) return found
  const { cwd, branch } = found.value

  if (await branchIsOut(deps, cwd, branch)) {
    const listed = await deps.git(['worktree', 'list', '--porcelain'], cwd)
    const path = listed.code === 0 ? worktreePathOf(listed.stdout, branch) : null
    if (path !== null) {
      const removed = await deps.git(['worktree', 'remove', '--force', path], cwd)
      if (removed.code !== 0) return cliTrouble(removed)
    }
    const dropped = await deps.git(['branch', '-D', branch], cwd)
    if (dropped.code !== 0) return cliTrouble(dropped)
    return won({ state: 'dropped' })
  }

  const sha = await mergeOf(deps, cwd, branch)
  if (sha === null) return lost('failed', branch)
  // A revert git could not finish leaves the tree exactly where git left it;
  // saying so is the honest answer, and the person resolves it themselves.
  const reverted = await deps.git(['revert', '-m', '1', '--no-edit', sha], cwd)
  if (reverted.code !== 0) return cliTrouble(reverted)
  return won({ state: 'reverted' })
}

export function registerWorktreeReview(): void {
  handle('worktree:diff', (_event, agentId) => worktreeDiff(liveDeps, agentId))
  handle('worktree:rollback', (_event, agentId) => worktreeRollback(liveDeps, agentId))
}
