import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { existsSync, lstatSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { followWorktrees, linkNodeModules, stopFollowingWorktrees } from './worktree-links'
import type { LinkDeps } from './worktree-links.types'

const made: string[] = []

afterEach(async () => {
  stopFollowingWorktrees()
  vi.useRealTimers()
  for (const dir of made.splice(0)) await rm(dir, { recursive: true, force: true })
})

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'zetrem-worktree-links-'))
  made.push(dir)
  return dir
}

function git(repo: string, ...args: string[]): void {
  execFileSync('git', args, { cwd: repo })
}

// How git sees the root's node_modules. Only 'ignored' is the folder a worktree
// is missing and would want linked in; the other two are the caller's own files.
type Standing = 'ignored' | 'tracked' | 'untracked'

async function repoWithNodeModules(standing: Standing): Promise<string> {
  const dir = await tempDir()
  git(dir, 'init', '--initial-branch=main')
  git(dir, 'config', 'user.email', 'test@example.com')
  git(dir, 'config', 'user.name', 'Test')
  git(dir, 'config', 'commit.gpgsign', 'false')
  await mkdir(join(dir, 'node_modules'), { recursive: true })
  await writeFile(join(dir, 'node_modules', 'placeholder.txt'), 'x')
  if (standing === 'tracked') git(dir, 'add', 'node_modules')
  if (standing === 'ignored') {
    await writeFile(join(dir, '.gitignore'), 'node_modules\n')
    git(dir, 'add', '.gitignore')
  }
  await writeFile(join(dir, 'a.txt'), 'one\n')
  git(dir, 'add', 'a.txt')
  git(dir, 'commit', '-m', 'chore: first')
  return dir
}

// The debounced link runs off a real timer and then awaits real fs promises, so
// there is no clock to advance: the link is waited for by looking for it.
async function waitFor(seen: () => boolean): Promise<void> {
  const until = Date.now() + 3000
  while (!seen()) {
    if (Date.now() > until) throw new Error('the link never appeared')
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

// A real symlink/junction dep, so the "already linked" behaviour of the
// filesystem itself is exercised, not a mock's idea of it.
function realDeps(overrides: Partial<LinkDeps> = {}): LinkDeps {
  return {
    exists: async (path) => {
      try {
        lstatSync(path)
        return true
      } catch {
        return false
      }
    },
    mkdir: (path) => mkdir(path, { recursive: true }).then(() => undefined),
    readdir: async (path) => (await import('node:fs/promises')).readdir(path),
    stat: async (path) => {
      const fs = await import('node:fs/promises')
      try {
        return await fs.stat(path)
      } catch {
        return null
      }
    },
    symlink: async (target, path, type) => {
      const fs = await import('node:fs/promises')
      await fs.symlink(target, path, type)
    },
    git: async (args, cwd) => {
      try {
        const out = execFileSync('git', args, { cwd, encoding: 'utf8' })
        return { code: 0, stdout: out, stderr: '' }
      } catch (cause: unknown) {
        const err = cause as { status?: number; stderr?: Buffer; message: string }
        return {
          code: err.status ?? 1,
          stdout: '',
          stderr: err.stderr?.toString() ?? err.message,
        }
      }
    },
    watch: vi.fn(() => ({ close: vi.fn() })),
    log: vi.fn(),
    ...overrides,
  }
}

describe('linkNodeModules', () => {
  it('links the main checkout node_modules into a fresh worktree', async () => {
    const root = await repoWithNodeModules('ignored')
    const worktree = await tempDir()
    const deps = realDeps()

    const said = await linkNodeModules(root, worktree, deps)

    expect(said).toBe('linked')
    expect(existsSync(join(worktree, 'node_modules', 'placeholder.txt'))).toBe(true)
  })

  it('reports present when the worktree already has node_modules', async () => {
    const root = await repoWithNodeModules('ignored')
    const worktree = await tempDir()
    await mkdir(join(worktree, 'node_modules'))
    const deps = realDeps()

    const said = await linkNodeModules(root, worktree, deps)

    expect(said).toBe('present')
  })

  it('skips when the root has no node_modules at all', async () => {
    const root = await tempDir()
    git(root, 'init', '--initial-branch=main')
    const worktree = await tempDir()
    const deps = realDeps()

    const said = await linkNodeModules(root, worktree, deps)

    expect(said).toBe('skipped')
  })

  it('skips when git tracks node_modules', async () => {
    const root = await repoWithNodeModules('tracked')
    const worktree = await tempDir()
    const deps = realDeps()

    const said = await linkNodeModules(root, worktree, deps)

    expect(said).toBe('skipped')
  })

  it('skips node_modules that is merely untracked, since a worktree carries it over', async () => {
    // Untracked and not ignored is a folder the checkout keeps for itself: a
    // worktree of it is not missing anything, so there is nothing to link.
    const root = await repoWithNodeModules('untracked')
    const worktree = await tempDir()
    const deps = realDeps()

    const said = await linkNodeModules(root, worktree, deps)

    expect(said).toBe('skipped')
    expect(existsSync(join(worktree, 'node_modules'))).toBe(false)
  })

  it('asks git whether node_modules is ignored, not whether it is tracked', async () => {
    const root = await repoWithNodeModules('ignored')
    const worktree = await tempDir()
    const asked: string[][] = []
    const deps = realDeps({
      git: async (args, cwd) => {
        asked.push(args)
        return realDeps().git(args, cwd)
      },
    })

    await linkNodeModules(root, worktree, deps)

    expect(asked.some((args) => args.includes('check-ignore'))).toBe(true)
    expect(asked.some((args) => args.includes('--error-unmatch'))).toBe(false)
  })

  it('reports failed and logs when the symlink call throws', async () => {
    const root = await repoWithNodeModules('ignored')
    const worktree = await tempDir()
    const log = vi.fn()
    const deps = realDeps({
      symlink: async () => {
        throw new Error('no permission')
      },
      log,
    })

    const said = await linkNodeModules(root, worktree, deps)

    expect(said).toBe('failed')
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('[worktree-links]'),
      worktree,
      expect.any(Error),
    )
  })
})

describe('followWorktrees', () => {
  it('links every worktree dir that already exists at follow time', async () => {
    const root = await repoWithNodeModules('ignored')
    const worktreesDir = join(root, '.claude', 'worktrees')
    await mkdir(join(worktreesDir, 'agent-1'), { recursive: true })
    const deps = realDeps()

    await followWorktrees(root, deps)

    expect(existsSync(join(worktreesDir, 'agent-1', 'node_modules'))).toBe(true)
  })

  it('links a directory that appears later, once, even if the watch event fires twice', async () => {
    const root = await repoWithNodeModules('ignored')
    const worktreesDir = join(root, '.claude', 'worktrees')
    await mkdir(worktreesDir, { recursive: true })

    type Listener = (eventType: string, filename: string | null) => void
    const heard: Listener[] = []
    const watch = vi.fn((_path: string, listener: Listener) => {
      heard.push(listener)
      return { close: vi.fn() }
    })
    // The debounce collapses two events into one pass, which is what a
    // symlink call count of exactly one - not the directory's mere presence,
    // which linkNodeModules would leave looking identical either way - proves.
    const symlink = vi.fn(async (target: string, path: string, type: 'dir' | 'junction') => {
      const fs = await import('node:fs/promises')
      await fs.symlink(target, path, type)
    })
    const deps = realDeps({ watch, symlink })

    await followWorktrees(root, deps)
    await mkdir(join(worktreesDir, 'agent-2'))

    heard[0]?.('rename', 'agent-2')
    heard[0]?.('rename', 'agent-2')

    await waitFor(() => existsSync(join(worktreesDir, 'agent-2', 'node_modules')))

    expect(symlink).toHaveBeenCalledTimes(1)
  })

  it('does not create a second watcher for the same root', async () => {
    const root = await repoWithNodeModules('ignored')
    const watch = vi.fn(() => ({ close: vi.fn() }))
    const deps = realDeps({ watch })

    await followWorktrees(root, deps)
    await followWorktrees(root, deps)

    expect(watch).toHaveBeenCalledTimes(1)
  })

  it('opens one watcher for two calls that land before either has finished', async () => {
    // agent:start calls this without awaiting it, so two sessions for one
    // project overlap: the slot has to be taken before the first await, or the
    // first watcher is opened and then lost with nothing holding it.
    const root = await repoWithNodeModules('ignored')
    const watch = vi.fn(() => ({ close: vi.fn() }))
    const deps = realDeps({ watch })

    await Promise.all([followWorktrees(root, deps), followWorktrees(root, deps)])

    expect(watch).toHaveBeenCalledTimes(1)
  })

  it('lets the next call try again when the watch could not be opened', async () => {
    // Holding a root that ended up with no watcher would mean this project is
    // never followed again for as long as it stays open.
    const root = await repoWithNodeModules('ignored')
    const log = vi.fn()
    const watch = vi.fn(() => {
      throw new Error('too many open files')
    })

    await followWorktrees(root, realDeps({ watch, log }))
    const second = vi.fn(() => ({ close: vi.fn() }))
    await followWorktrees(root, realDeps({ watch: second }))

    expect(log).toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('closes the previous watcher when following a different root', async () => {
    const rootA = await repoWithNodeModules('ignored')
    const rootB = await repoWithNodeModules('ignored')
    const closeA = vi.fn()
    const watchA = vi.fn(() => ({ close: closeA }))
    const watchB = vi.fn(() => ({ close: vi.fn() }))

    await followWorktrees(rootA, realDeps({ watch: watchA }))
    await followWorktrees(rootB, realDeps({ watch: watchB }))

    expect(closeA).toHaveBeenCalledTimes(1)
  })

  it('leaves only the last root watched when a second root lands mid-flight', async () => {
    const rootA = await repoWithNodeModules('ignored')
    const rootB = await repoWithNodeModules('ignored')
    const closeA = vi.fn()
    const closeB = vi.fn()
    const watchA = vi.fn(() => ({ close: closeA }))
    const watchB = vi.fn(() => ({ close: closeB }))

    const first = followWorktrees(rootA, realDeps({ watch: watchA }))
    const second = followWorktrees(rootB, realDeps({ watch: watchB }))
    await Promise.all([first, second])

    // A watcher rootA opened after it lost the slot is one nothing can close
    // later, so it has to be closed on the way out.
    expect(watchA.mock.calls.length, 'rootA left a watcher behind').toBe(closeA.mock.calls.length)
    expect(watchB).toHaveBeenCalledTimes(1)
    expect(closeB).not.toHaveBeenCalled()

    stopFollowingWorktrees()

    expect(closeB).toHaveBeenCalledTimes(1)
  })
})
