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

async function repoWithNodeModules(tracked: boolean): Promise<string> {
  const dir = await tempDir()
  git(dir, 'init', '--initial-branch=main')
  git(dir, 'config', 'user.email', 'test@example.com')
  git(dir, 'config', 'user.name', 'Test')
  git(dir, 'config', 'commit.gpgsign', 'false')
  await mkdir(join(dir, 'node_modules'), { recursive: true })
  await writeFile(join(dir, 'node_modules', 'placeholder.txt'), 'x')
  if (tracked) {
    git(dir, 'add', 'node_modules')
  } else {
    await writeFile(join(dir, '.gitignore'), 'node_modules\n')
    git(dir, 'add', '.gitignore')
  }
  await writeFile(join(dir, 'a.txt'), 'one\n')
  git(dir, 'add', 'a.txt')
  git(dir, 'commit', '-m', 'chore: first')
  return dir
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
    const root = await repoWithNodeModules(false)
    const worktree = await tempDir()
    const deps = realDeps()

    const said = await linkNodeModules(root, worktree, deps)

    expect(said).toBe('linked')
    expect(existsSync(join(worktree, 'node_modules', 'placeholder.txt'))).toBe(true)
  })

  it('reports present when the worktree already has node_modules', async () => {
    const root = await repoWithNodeModules(false)
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
    const root = await repoWithNodeModules(true)
    const worktree = await tempDir()
    const deps = realDeps()

    const said = await linkNodeModules(root, worktree, deps)

    expect(said).toBe('skipped')
  })

  it('reports failed and logs when the symlink call throws', async () => {
    const root = await repoWithNodeModules(false)
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
    const root = await repoWithNodeModules(false)
    const worktreesDir = join(root, '.claude', 'worktrees')
    await mkdir(join(worktreesDir, 'agent-1'), { recursive: true })
    const deps = realDeps()

    await followWorktrees(root, deps)

    expect(existsSync(join(worktreesDir, 'agent-1', 'node_modules'))).toBe(true)
  })

  it('links a directory that appears later, once, even if the watch event fires twice', async () => {
    const root = await repoWithNodeModules(false)
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

    // Real timers: the debounced callback awaits real fs promises, which a
    // fake clock does not drive to completion.
    await new Promise((resolve) => setTimeout(resolve, 260))

    expect(existsSync(join(worktreesDir, 'agent-2', 'node_modules'))).toBe(true)
    expect(symlink).toHaveBeenCalledTimes(1)
  })

  it('does not create a second watcher for the same root', async () => {
    const root = await repoWithNodeModules(false)
    const watch = vi.fn(() => ({ close: vi.fn() }))
    const deps = realDeps({ watch })

    await followWorktrees(root, deps)
    await followWorktrees(root, deps)

    expect(watch).toHaveBeenCalledTimes(1)
  })

  it('closes the previous watcher when following a different root', async () => {
    const rootA = await repoWithNodeModules(false)
    const rootB = await repoWithNodeModules(false)
    const closeA = vi.fn()
    const watchA = vi.fn(() => ({ close: closeA }))
    const watchB = vi.fn(() => ({ close: vi.fn() }))

    await followWorktrees(rootA, realDeps({ watch: watchA }))
    await followWorktrees(rootB, realDeps({ watch: watchB }))

    expect(closeA).toHaveBeenCalledTimes(1)
  })
})
