import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReviewDeps } from './worktree-review.types'

vi.mock('electron', () => ({
  app: { getPath: () => '/userData' },
  BrowserWindow: { fromWebContents: () => null },
  ipcMain: { handle: () => undefined },
}))

const { worktreeDiff, worktreeRollback, runGit } = await import('./worktree-review')

const ID = 'a879059595fc11096'
const BRANCH = `worktree-agent-${ID}`

const made: string[] = []

afterEach(async () => {
  for (const dir of made.splice(0)) await rm(dir, { recursive: true, force: true })
})

function git(repo: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8' })
}

async function repo(): Promise<{ dir: string; deps: ReviewDeps }> {
  const dir = await mkdtemp(join(tmpdir(), 'zetrem-worktree-'))
  made.push(dir)
  git(dir, 'init', '--initial-branch=main')
  git(dir, 'config', 'user.email', 'test@example.com')
  git(dir, 'config', 'user.name', 'Test')
  git(dir, 'config', 'commit.gpgsign', 'false')
  await writeFile(join(dir, 'a.txt'), 'one\n')
  git(dir, 'add', '.')
  git(dir, 'commit', '-m', 'chore: first')
  return { dir, deps: { here: async () => dir, git: runGit } }
}

// What an isolated teammate leaves behind: a branch of its own with a commit
// on it, checked out in a worktree under .claude/worktrees/.
async function teammateWrote(dir: string): Promise<void> {
  const at = join(dir, '.claude', 'worktrees', 'agent-1')
  await mkdir(join(dir, '.claude', 'worktrees'), { recursive: true })
  git(dir, 'worktree', 'add', '-b', BRANCH, at)
  await writeFile(join(at, 'a.txt'), 'one\ntwo\n')
  execFileSync('git', ['add', '.'], { cwd: at })
  execFileSync('git', ['commit', '-m', 'feat: two'], { cwd: at })
}

describe('against a real repository, a branch still out', () => {
  it('shows what the teammate added, and nothing the main tree already had', async () => {
    const { dir, deps } = await repo()
    await teammateWrote(dir)

    const shown = await worktreeDiff(deps, ID)

    expect(shown.ok).toBe(true)
    if (!shown.ok) return
    expect(shown.value.state).toBe('branch')
    expect(shown.value.diff).toContain('+two')
    expect(shown.value.diff).toContain('a.txt')
  })

  it('drops the worktree and the branch, and the tree is left as it was', async () => {
    const { dir, deps } = await repo()
    await teammateWrote(dir)

    const done = await worktreeRollback(deps, ID)

    expect(done).toEqual({ ok: true, value: { state: 'dropped' } })
    expect(git(dir, 'branch', '--list', BRANCH).trim()).toBe('')
    expect(git(dir, 'worktree', 'list', '--porcelain')).not.toContain(BRANCH)
    expect(await worktreeDiff(deps, ID)).toEqual({
      ok: false,
      why: { code: 'failed', said: BRANCH },
    })
  })
})

describe('against a real repository, a branch already merged', () => {
  async function merged(): Promise<{ dir: string; deps: ReviewDeps }> {
    const { dir, deps } = await repo()
    await teammateWrote(dir)
    git(dir, 'merge', '--no-ff', '--no-edit', BRANCH)
    git(dir, 'worktree', 'remove', '--force', join(dir, '.claude', 'worktrees', 'agent-1'))
    git(dir, 'branch', '-D', BRANCH)
    return { dir, deps }
  }

  it('finds the merge commit by its subject and reads the diff off its first parent', async () => {
    const { deps } = await merged()

    const shown = await worktreeDiff(deps, ID)

    expect(shown.ok).toBe(true)
    if (!shown.ok) return
    expect(shown.value.state).toBe('merged')
    expect(shown.value.diff).toContain('+two')
  })

  it('reverts the merge with a new commit, leaving the history that landed', async () => {
    const { dir, deps } = await merged()
    const before = git(dir, 'rev-list', '--count', 'HEAD').trim()

    expect(await worktreeRollback(deps, ID)).toEqual({ ok: true, value: { state: 'reverted' } })

    expect(git(dir, 'show', 'HEAD:a.txt')).toBe('one\n')
    expect(Number(git(dir, 'rev-list', '--count', 'HEAD').trim())).toBe(Number(before) + 1)
    expect(git(dir, 'log', '-1', '--format=%s')).toContain('Revert')
  })

  it('says what git said when a revert cannot run over a dirty file', async () => {
    const { dir, deps } = await merged()
    await writeFile(join(dir, 'a.txt'), 'edited by hand\n')

    const done = await worktreeRollback(deps, ID)

    expect(done.ok).toBe(false)
    if (done.ok) return
    expect(done.why.code).toBe('cli')
    expect(done.why.said.length).toBeGreaterThan(0)
    expect(git(dir, 'show', ':a.txt')).toBe('one\ntwo\n')
  })
})
