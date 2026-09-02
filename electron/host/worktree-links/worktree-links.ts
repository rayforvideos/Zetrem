import { promises as fsPromises, watch as fsWatch } from 'node:fs'
import { join } from 'node:path'
import { runGit } from '../worktree-review/worktree-review'
import type { LinkDeps, LinkResult, LinkWatcher } from './worktree-links.types'

const DEBOUNCE_MS = 200

export const liveDeps: LinkDeps = {
  exists: async (path) => {
    try {
      await fsPromises.lstat(path)
      return true
    } catch {
      return false
    }
  },
  mkdir: async (path) => {
    await fsPromises.mkdir(path, { recursive: true })
  },
  readdir: (path) => fsPromises.readdir(path),
  stat: async (path) => {
    try {
      return await fsPromises.stat(path)
    } catch {
      return null
    }
  },
  symlink: (target, path, type) => fsPromises.symlink(target, path, type),
  git: runGit,
  watch: (path, listener) => fsWatch(path, listener),
  log: console.error,
}

// A worktree is a fresh checkout: gitignored folders like node_modules are
// absent, so anything that resolves them relative to the worktree root
// breaks. This links the main checkout's node_modules in, never installing
// anything of its own. Skipped when there is nothing to link (no
// node_modules at all, or one git already tracks - linking a tracked folder
// would be surprising and is never what this is for).
export async function linkNodeModules(
  root: string,
  worktree: string,
  deps: LinkDeps,
): Promise<LinkResult> {
  const source = join(root, 'node_modules')
  if (!(await deps.exists(source))) return 'skipped'

  const tracked = await deps.git(['ls-files', '--error-unmatch', 'node_modules'], root)
  if (tracked.code === 0) return 'skipped'

  const target = join(worktree, 'node_modules')
  if (await deps.exists(target)) return 'present'

  try {
    await deps.symlink(source, target, process.platform === 'win32' ? 'junction' : 'dir')
    return 'linked'
  } catch (cause: unknown) {
    deps.log('[worktree-links] could not link node_modules into', worktree, cause)
    return 'failed'
  }
}

async function linkIfDirectory(
  root: string,
  worktreesDir: string,
  name: string,
  deps: LinkDeps,
): Promise<void> {
  const path = join(worktreesDir, name)
  const info = await deps.stat(path)
  if (info === null || !info.isDirectory()) return
  await linkNodeModules(root, path, deps)
}

type Session = {
  root: string
  worktreesDir: string
  watcher: LinkWatcher
  timers: Map<string, ReturnType<typeof setTimeout>>
}

// The project's own worktrees folder is followed for as long as one project
// is open, one watcher at a time - a second call for the same root changes
// nothing, and a call for a different root replaces it. Mirrors followGit
// in git-desk.ts.
let session: Session | null = null

export async function followWorktrees(root: string, deps: LinkDeps): Promise<void> {
  if (session?.root === root) return
  stopFollowingWorktrees()

  const worktreesDir = join(root, '.claude', 'worktrees')
  try {
    await deps.mkdir(worktreesDir)
  } catch (cause: unknown) {
    deps.log('[worktree-links] could not create', worktreesDir, cause)
    return
  }

  let names: string[]
  try {
    names = await deps.readdir(worktreesDir)
  } catch (cause: unknown) {
    deps.log('[worktree-links] could not read', worktreesDir, cause)
    names = []
  }
  for (const name of names) {
    if (name.startsWith('.')) continue
    await linkIfDirectory(root, worktreesDir, name, deps)
  }

  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  try {
    const watcher = deps.watch(worktreesDir, (_eventType, filename) => {
      if (filename === null || filename.startsWith('.')) return
      const already = timers.get(filename)
      if (already !== undefined) clearTimeout(already)
      timers.set(
        filename,
        setTimeout(() => {
          timers.delete(filename)
          linkIfDirectory(root, worktreesDir, filename, deps).catch((cause: unknown) => {
            deps.log('[worktree-links] could not link', filename, cause)
          })
        }, DEBOUNCE_MS),
      )
    })
    session = { root, worktreesDir, watcher, timers }
  } catch (cause: unknown) {
    deps.log('[worktree-links] could not watch', worktreesDir, cause)
  }
}

export function stopFollowingWorktrees(): void {
  if (session === null) return
  for (const timer of session.timers.values()) clearTimeout(timer)
  session.watcher.close()
  session = null
}
