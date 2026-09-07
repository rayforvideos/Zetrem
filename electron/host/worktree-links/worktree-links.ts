import { promises as fsPromises, watch as fsWatch } from 'node:fs'
import { join } from 'node:path'
import { runGit } from '../../shell/git-run/git-run'
import type { LinkDeps, LinkResult, LinkWatcher } from './worktree-links.types'

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
// anything of its own. Being ignored is the whole condition - that is exactly
// what a worktree leaves behind. A tracked node_modules comes with the
// checkout, and an untracked one that nothing ignores is the caller's own
// folder: neither is missing, and neither is this module's to replace.
export async function linkNodeModules(
  root: string,
  worktree: string,
  deps: LinkDeps,
): Promise<LinkResult> {
  const source = join(root, 'node_modules')
  if (!(await deps.exists(source))) return 'skipped'

  const ignored = await deps.git(['check-ignore', '-q', 'node_modules'], root)
  if (ignored.code !== 0) return 'skipped'

  const target = join(worktree, 'node_modules')
  if (await deps.exists(target)) return 'present'

  try {
    // A junction is what Windows gives without the developer-mode rights a
    // symlink asks for. Release check, and it cannot be run from macOS:
    // removing a worktree must leave the main checkout's node_modules in
    // place - verify on Windows before release.
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

// One root's turn at being followed. The claim is taken before the first await
// and answers for the whole run, so what a caller gets back is the pass that is
// already under way rather than a second one. `done` is kept until the folder
// is under watch and everything already in it is linked, which is what a caller
// waits on before it lets anything make a worktree; `running` holds the link
// pass each name has in flight; `dropped` says the claim was given up.
type Claim = {
  root: string
  done: Promise<void>
  watcher: LinkWatcher | null
  running: Map<string, Promise<void>>
  dropped: boolean
}

// A worktree is linked the moment it is first seen. A name whose pass is still
// in flight is left to that pass, which is all the debounce timer that used to
// stand here ever did - and it did it by waiting a fifth of a second first,
// which is a fifth of a second in which a teammate runs its first command in a
// worktree that has no node_modules yet.
function linkOnce(claim: Claim, worktreesDir: string, name: string, deps: LinkDeps): void {
  if (claim.running.has(name)) return
  const pass = linkIfDirectory(claim.root, worktreesDir, name, deps)
    .catch((cause: unknown) => {
      deps.log('[worktree-links] could not link', name, cause)
    })
    .finally(() => {
      claim.running.delete(name)
    })
  claim.running.set(name, pass)
}

// The project's own worktrees folder is followed for as long as one project
// is open, one watcher at a time - a second call for the same root joins the
// first, and a call for a different root replaces it. Mirrors followGit
// in git-desk.ts.
let held: Claim | null = null

// agent:start calls this without awaiting it, so two starts for one project can
// land inside the same pass. Whoever gets here first holds the root until it is
// let go, which is what keeps a watcher from being opened twice and losing one.
export function followWorktrees(root: string, deps: LinkDeps): Promise<void> {
  if (held !== null && held.root === root) return held.done
  stopFollowingWorktrees()

  const claim: Claim = {
    root,
    done: Promise.resolve(),
    watcher: null,
    running: new Map(),
    dropped: false,
  }
  held = claim
  claim.done = follow(root, deps, claim)
  return claim.done
}

async function follow(root: string, deps: LinkDeps, claim: Claim): Promise<void> {
  const worktreesDir = join(root, '.claude', 'worktrees')
  try {
    await deps.mkdir(worktreesDir)
  } catch (cause: unknown) {
    deps.log('[worktree-links] could not create', worktreesDir, cause)
    giveUp(claim)
    return
  }
  if (claim.dropped) return

  // The watcher goes up before the folder is read, not after it. A worktree
  // that lands in between is one no event ever reports and no reading ever
  // sees, and the moment a session starts handing out work is exactly when
  // worktrees land. Anything the two both catch is collapsed by linkOnce.
  let watching = true
  try {
    claim.watcher = deps.watch(worktreesDir, (_eventType, filename) => {
      if (filename === null || filename.startsWith('.')) return
      linkOnce(claim, worktreesDir, filename, deps)
    })
  } catch (cause: unknown) {
    deps.log('[worktree-links] could not watch', worktreesDir, cause)
    watching = false
  }
  if (claim.dropped) {
    release(claim)
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
    if (claim.dropped) break
    if (name.startsWith('.')) continue
    linkOnce(claim, worktreesDir, name, deps)
  }
  await Promise.all([...claim.running.values()])

  if (!watching) {
    giveUp(claim)
    return
  }
  // The claim can be let go while the pass above is still running, and then
  // nothing is left holding this watcher: it is closed here instead.
  if (claim.dropped) release(claim)
}

// A pass that ended with no watcher must not go on holding the root, or the
// project is never followed again for as long as it stays open. Whoever asks
// next starts a pass of its own; a root already taken by someone else is left
// exactly as it is.
function giveUp(claim: Claim): void {
  if (held === claim) held = null
}

// A link pass already in flight is left to finish: it is one symlink into a
// folder that wants it either way, and there is no timer left to cancel.
function release(claim: Claim): void {
  claim.watcher?.close()
  claim.watcher = null
}

export function stopFollowingWorktrees(): void {
  const claim = held
  if (claim === null) return
  held = null
  claim.dropped = true
  release(claim)
}
