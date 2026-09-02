import type { GitReply } from '../../shell/git-run/git-run.types'

// A watcher this module can close later. fs.watch satisfies this directly.
export type LinkWatcher = { close(): void }

export type LinkResult = 'linked' | 'present' | 'skipped' | 'failed'

export type LinkDeps = {
  // True for anything at path: a file, a directory, or a link, broken or not.
  exists(path: string): Promise<boolean>
  mkdir(path: string): Promise<void>
  readdir(path: string): Promise<string[]>
  stat(path: string): Promise<{ isDirectory(): boolean } | null>
  symlink(target: string, path: string, type: 'dir' | 'junction'): Promise<void>
  git(args: string[], cwd: string): Promise<GitReply>
  watch(path: string, listener: (eventType: string, filename: string | null) => void): LinkWatcher
  log(...args: unknown[]): void
}
