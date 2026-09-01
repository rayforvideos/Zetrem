import { describe, expect, it, vi } from 'vitest'
import type { GitReply, ReviewDeps } from './worktree-review.types'

vi.mock('electron', () => ({
  app: { getPath: () => '/userData' },
  BrowserWindow: { fromWebContents: () => null },
  ipcMain: { handle: () => undefined },
}))

const { worktreeDiff, worktreeRollback, worktreePathOf } = await import('./worktree-review')

const ID = 'a879059595fc11096'
const BRANCH = `worktree-agent-${ID}`

type Script = [string, Partial<GitReply>][]

function fake(script: Script, here: string | null = '/repo'): { deps: ReviewDeps; ran: string[] } {
  const ran: string[] = []
  return {
    ran,
    deps: {
      here: async () => here,
      git: async (args) => {
        const said = args.join(' ')
        ran.push(said)
        const found = script.find(([prefix]) => said.startsWith(prefix))
        return { code: 1, stdout: '', stderr: 'nothing scripted', ...(found?.[1] ?? {}) }
      },
    },
  }
}

const HAS_BRANCH: Script[number] = [`rev-parse --verify --quiet refs/heads/${BRANCH}`, { code: 0 }]
const NO_BRANCH: Script[number] = [
  `rev-parse --verify --quiet refs/heads/${BRANCH}`,
  { code: 1, stderr: '' },
]
const MERGED: Script[number] = [
  `log --merges --grep worktree-agent-${ID}`,
  { code: 0, stdout: 'deadbeef\n' },
]
const NOT_MERGED: Script[number] = [`log --merges --grep`, { code: 0, stdout: '' }]

describe('showing what an isolated teammate wrote', () => {
  it('reads a branch that is still out against where it left the tree', async () => {
    const { deps, ran } = fake([
      HAS_BRANCH,
      ['merge-base', { code: 0, stdout: 'base111\n' }],
      ['diff base111', { code: 0, stdout: '--- a\n+++ b\n' }],
    ])
    const result = await worktreeDiff(deps, ID)

    expect(result).toEqual({ ok: true, value: { state: 'branch', diff: '--- a\n+++ b\n' } })
    expect(ran).toContain(`merge-base HEAD ${BRANCH}`)
    expect(ran).toContain(`diff base111 ${BRANCH}`)
  })

  it('reads a branch already merged off the merge commit, against its first parent', async () => {
    const { deps, ran } = fake([
      NO_BRANCH,
      MERGED,
      ['diff deadbeef^1 deadbeef', { code: 0, stdout: '+one line\n' }],
    ])
    const result = await worktreeDiff(deps, ID)

    expect(result).toEqual({ ok: true, value: { state: 'merged', diff: '+one line\n' } })
    expect(ran.some((one) => one.includes('--merges'))).toBe(true)
  })

  it('says which branch it could not find when neither is there', async () => {
    const { deps } = fake([NO_BRANCH, NOT_MERGED])
    expect(await worktreeDiff(deps, ID)).toEqual({
      ok: false,
      why: { code: 'failed', said: BRANCH },
    })
  })

  it('hands git its own words back when git itself fails', async () => {
    const { deps } = fake([
      HAS_BRANCH,
      ['merge-base', { code: 128, stderr: 'fatal: bad revision\n' }],
    ])
    expect(await worktreeDiff(deps, ID)).toEqual({
      ok: false,
      why: { code: 'cli', said: 'fatal: bad revision' },
    })
  })

  it('refuses an id that could never name a branch, before running anything', async () => {
    const { deps, ran } = fake([])
    for (const bad of ['', 'abc', '../../etc', 'HEAD; rm -rf /', 'ZZZZZZ']) {
      expect(await worktreeDiff(deps, bad)).toEqual({
        ok: false,
        why: { code: 'refused', said: 'agent-id' },
      })
    }
    expect(ran).toEqual([])
  })

  it('has nowhere to look with no project open', async () => {
    const { deps, ran } = fake([], null)
    expect(await worktreeDiff(deps, ID)).toEqual({
      ok: false,
      why: { code: 'failed', said: 'no-project' },
    })
    expect(ran).toEqual([])
  })
})

describe('taking the work of an isolated teammate back out', () => {
  const LISTED = `worktree /repo\nHEAD aaa\nbranch refs/heads/main\n\nworktree /repo/.claude/worktrees/agent-1\nHEAD bbb\nbranch refs/heads/${BRANCH}\n`

  it('removes the worktree, then the branch, when the work never landed', async () => {
    const { deps, ran } = fake([
      HAS_BRANCH,
      ['worktree list', { code: 0, stdout: LISTED }],
      ['worktree remove', { code: 0 }],
      ['branch -D', { code: 0 }],
    ])
    const result = await worktreeRollback(deps, ID)

    expect(result).toEqual({ ok: true, value: { state: 'dropped' } })
    expect(ran).toContain('worktree remove --force /repo/.claude/worktrees/agent-1')
    expect(ran).toContain(`branch -D ${BRANCH}`)
  })

  it('still drops the branch when no worktree is checked out for it', async () => {
    const { deps, ran } = fake([
      HAS_BRANCH,
      ['worktree list', { code: 0, stdout: 'worktree /repo\nbranch refs/heads/main\n' }],
      ['branch -D', { code: 0 }],
    ])
    expect(await worktreeRollback(deps, ID)).toEqual({ ok: true, value: { state: 'dropped' } })
    expect(ran.some((one) => one.startsWith('worktree remove'))).toBe(false)
  })

  it('reverts a merge that already landed rather than rewriting the history', async () => {
    const { deps, ran } = fake([NO_BRANCH, MERGED, ['revert', { code: 0 }]])
    expect(await worktreeRollback(deps, ID)).toEqual({ ok: true, value: { state: 'reverted' } })
    expect(ran).toContain('revert -m 1 --no-edit deadbeef')
  })

  it('reports a revert git would not finish, and leaves the tree as git left it', async () => {
    const { deps } = fake([
      NO_BRANCH,
      MERGED,
      ['revert', { code: 1, stderr: 'error: your local changes would be overwritten\n' }],
    ])
    expect(await worktreeRollback(deps, ID)).toEqual({
      ok: false,
      why: { code: 'cli', said: 'error: your local changes would be overwritten' },
    })
  })

  it('has nothing to take back when neither a branch nor a merge is left', async () => {
    const { deps } = fake([NO_BRANCH, NOT_MERGED])
    expect(await worktreeRollback(deps, ID)).toEqual({
      ok: false,
      why: { code: 'failed', said: BRANCH },
    })
  })

  it('refuses an id that could never name a branch', async () => {
    const { deps, ran } = fake([])
    expect(await worktreeRollback(deps, 'nope')).toEqual({
      ok: false,
      why: { code: 'refused', said: 'agent-id' },
    })
    expect(ran).toEqual([])
  })
})

describe('finding the folder a branch is checked out in', () => {
  it('takes the path from the block the branch line belongs to', () => {
    const listed = `worktree /repo\nHEAD aaa\nbranch refs/heads/main\n\nworktree /repo/wt\nHEAD bbb\nbranch refs/heads/${BRANCH}\n`
    expect(worktreePathOf(listed, BRANCH)).toBe('/repo/wt')
  })

  it('answers with nothing when no block names that branch', () => {
    expect(worktreePathOf('worktree /repo\nbranch refs/heads/main\n', BRANCH)).toBeNull()
    expect(worktreePathOf('', BRANCH)).toBeNull()
  })
})
