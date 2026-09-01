import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { watch } from 'node:fs'
import type { FSWatcher } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join as joinPath } from 'node:path'
import { BrowserWindow } from 'electron'
import { isAbsolute, join, normalize } from 'node:path'
import type {
  GitBranch,
  GitCommitLine,
  GitStash,
  GitStat,
  GitStatus,
  GraphCommit,
  ShownFile,
} from '@/entities/git/model/repo'
import { lost, won } from '@/shared/lib/outcome/outcome'
import type { Outcome } from '@/shared/lib/outcome/outcome.types'
import { handle, push } from '../../ipc/ipc'
import { recallProject } from '../../store/project-memory/project-memory'
import { runGit } from '../worktree-review/worktree-review'
import type { GitReply } from '../worktree-review/worktree-review.types'
import type { DiffSide, GitDeps } from './git-desk.types'

const execFileAsync = promisify(execFile)

// Git C-quotes a path holding bytes it distrusts ("scratch-\\355...\"): the
// live runs turn quoting off, but a stray config or control byte can still
// hand one over, and the octal escapes decode back to UTF-8 here.
function plainPath(path: string): string {
  if (!path.startsWith('"') || !path.endsWith('"')) return path
  const inner = path.slice(1, -1)
  const bytes: number[] = []
  for (let at = 0; at < inner.length; at++) {
    const char = inner[at] as string
    if (char !== '\\') {
      bytes.push(char.charCodeAt(0))
      continue
    }
    const next = inner[at + 1] ?? ''
    if (/[0-7]/.test(next)) {
      bytes.push(Number.parseInt(inner.slice(at + 1, at + 4), 8))
      at += 3
    } else {
      bytes.push(({ n: 10, t: 9, r: 13 } as Record<string, number>)[next] ?? next.charCodeAt(0))
      at += 1
    }
  }
  return new TextDecoder().decode(new Uint8Array(bytes))
}

// `git status --porcelain=v2 --branch` writes header lines starting with #,
// then one line per entry: `1` ordinary, `2` rename (path first, origin after
// a tab), `u` unmerged, `?` untracked. The XY pair holds the staged letter
// then the unstaged one, with `.` for an untouched side.
export function statusOf(porcelain: string): GitStatus {
  const status: GitStatus = { branch: '', upstream: null, ahead: 0, behind: 0, files: [] }
  for (const line of porcelain.split('\n')) {
    if (line.startsWith('# branch.head ')) status.branch = line.slice('# branch.head '.length)
    else if (line.startsWith('# branch.upstream '))
      status.upstream = line.slice('# branch.upstream '.length)
    else if (line.startsWith('# branch.ab ')) {
      const apart = /\+(\d+) -(\d+)/.exec(line)
      status.ahead = Number(apart?.[1] ?? 0)
      status.behind = Number(apart?.[2] ?? 0)
    } else if (line.startsWith('? ')) {
      status.files.push({
        path: plainPath(line.slice(2)),
        staged: false,
        unstaged: true,
        sign: '?',
      })
    } else if (line.startsWith('u ')) {
      // An unmerged entry: both sides changed it and the merge stopped there.
      const path = plainPath(line.split(' ').slice(10).join(' '))
      status.files.push({ path, staged: false, unstaged: true, sign: 'U' })
    } else if (line.startsWith('1 ') || line.startsWith('2 ')) {
      const [, xy = '..'] = line.split(' ')
      const staged = xy[0] !== '.'
      const unstaged = xy[1] !== '.'
      const tail = line
        .split(' ')
        .slice(line.startsWith('1 ') ? 8 : 9)
        .join(' ')
      const path = plainPath(line.startsWith('2 ') ? (tail.split('\t')[0] ?? tail) : tail)
      const sign = staged ? (xy[0] ?? 'M') : (xy[1] ?? 'M')
      status.files.push({ path, staged, unstaged, sign })
    }
  }
  return status
}

// From `git branch --format=%(HEAD)%09%(refname:short)`: a star in the first
// column marks the branch that is checked out.
export function branchesOf(out: string): GitBranch[] {
  return out
    .split('\n')
    .filter((line) => line.includes('\t'))
    .map((line) => {
      const at = line.indexOf('\t')
      return { name: line.slice(at + 1), current: line.startsWith('*') }
    })
}

// From `git log --format=%h%x09%s`: the first tab splits hash from subject,
// and a tab inside the subject stays where it was.
export function logOf(out: string): GitCommitLine[] {
  return out
    .split('\n')
    .filter((line) => line.includes('\t'))
    .map((line) => {
      const at = line.indexOf('\t')
      return { sha: line.slice(0, at), subject: line.slice(at + 1) }
    })
}

// The graph log line: sha, short, parents, refs, author, email, seconds,
// subject, tab-separated with %x09 so only the subject can hold a tab.
export function graphOf(out: string): GraphCommit[] {
  const commits: GraphCommit[] = []
  for (const line of out.split('\n')) {
    const parts = line.split('\t')
    if (parts.length < 8) continue
    const [sha = '', short = '', parents = '', decorate = '', author = '', email = '', when = ''] =
      parts
    const subject = parts.slice(7).join('\t')
    let head = false
    const refs: string[] = []
    for (const said of decorate.split(', ').filter((one) => one.length > 0)) {
      if (said.startsWith('HEAD -> ')) {
        head = true
        refs.push(said.slice('HEAD -> '.length))
      } else if (said === 'HEAD') head = true
      else if (said.startsWith('tag: ')) refs.push(said.slice('tag: '.length))
      else refs.push(said)
    }
    commits.push({
      sha,
      short,
      parents: parents.split(' ').filter((one) => one.length > 0),
      refs,
      head,
      author,
      email,
      at: Number(when) * 1000,
      subject,
      stat: { files: 0, adds: 0, dels: 0 },
    })
  }
  return commits
}

// `--name-status` writes `M\tpath`, and a rename `R<score>\told\tnew`: the
// name that still exists is the one the list shows.
export function shownOf(out: string): ShownFile[] {
  return out
    .split('\n')
    .filter((line) => line.includes('\t'))
    .map((line) => {
      const parts = line.split('\t')
      const sign = (parts[0] ?? 'M')[0] ?? 'M'
      const path = (sign === 'R' || sign === 'C' ? parts[2] : parts[1]) ?? ''
      return { path, sign }
    })
    .filter((file) => file.path.length > 0)
}

// `--shortstat` after a bare-sha format: each commit prints its sha, then
// one " N files changed, A insertions(+), D deletions(-)" line — absent
// entirely for an empty commit, and either count can be missing.
export function statsOf(out: string): Record<string, GitStat> {
  const stats: Record<string, GitStat> = {}
  let sha = ''
  for (const line of out.split('\n')) {
    if (/^[0-9a-f]{4,40}$/.test(line.trim()) && !line.startsWith(' ')) {
      sha = line.trim()
      stats[sha] = { files: 0, adds: 0, dels: 0 }
      continue
    }
    const said =
      /(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/.exec(line)
    if (said !== null && sha.length > 0) {
      stats[sha] = {
        files: Number(said[1]),
        adds: Number(said[2] ?? 0),
        dels: Number(said[3] ?? 0),
      }
    }
  }
  return stats
}

// A path the renderer hands back is only ever one of the repo's own,
// relative and staying inside; a branch name must not read as a flag.
function tamePath(path: string): boolean {
  return (
    path.length > 0 &&
    !isAbsolute(path) &&
    !path.startsWith('-') &&
    !normalize(path).split(/[\\/]/).includes('..')
  )
}

const BRANCH_NAME = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/

function cliTrouble<T>(reply: GitReply): Outcome<T> {
  // The runner substitutes its own "Command failed" line for a silent
  // stderr; git's actual account of a refusal often sits on stdout.
  const flat = reply.stderr.trim()
  const said =
    (flat.startsWith('Command failed:') || flat.length === 0) && reply.stdout.trim().length > 0
      ? reply.stdout.trim()
      : flat
  return said.includes('not a git repository')
    ? lost<T>('refused', 'no-repo')
    : lost<T>('cli', said)
}

async function whereabouts(deps: GitDeps): Promise<Outcome<string>> {
  const cwd = await deps.here()
  return cwd === null ? lost('refused', 'no-project') : won(cwd)
}

async function ran(deps: GitDeps, cwd: string, args: string[]): Promise<Outcome<string>> {
  const reply = await deps.git(args, cwd)
  return reply.code === 0 ? won(reply.stdout) : cliTrouble(reply)
}

export async function gitStatus(deps: GitDeps): Promise<Outcome<GitStatus>> {
  const at = await whereabouts(deps)
  if (!at.ok) return at
  const said = await ran(deps, at.value, [
    'status',
    '--porcelain=v2',
    '--branch',
    // Folders never stand in for their files: a folder has no diff to show.
    '--untracked-files=all',
  ])
  return said.ok ? won(statusOf(said.value)) : said
}

export async function gitBranches(deps: GitDeps): Promise<Outcome<GitBranch[]>> {
  const at = await whereabouts(deps)
  if (!at.ok) return at
  const said = await ran(deps, at.value, ['branch', '--format=%(HEAD)%09%(refname:short)'])
  return said.ok ? won(branchesOf(said.value)) : said
}

export async function gitLog(deps: GitDeps): Promise<Outcome<GitCommitLine[]>> {
  const at = await whereabouts(deps)
  if (!at.ok) return at
  const said = await ran(deps, at.value, ['log', '--format=%h%x09%s', '-n', '20'])
  // A repo with no commit yet has no log, and that is an empty list.
  return said.ok ? won(logOf(said.value)) : won([])
}

// The side is only a hint: the status it came from can be moments stale, so
// an empty answer tries the other side, and a file git does not know at all
// is drawn from the disk. The pane never says "nothing" while something is
// there to show.
export async function gitDiff(
  deps: GitDeps,
  path: string,
  side: DiffSide,
): Promise<Outcome<string>> {
  if (!tamePath(path)) return lost('refused', 'path')
  const at = await whereabouts(deps)
  if (!at.ok) return at

  const fromDisk = async (): Promise<Outcome<string> | null> => {
    const body = await deps.read(join(at.value, path))
    if (body === null) return null
    if (body.includes('\u0000')) return lost('unsupported', 'binary')
    if (body.length > DIFF_MAX) return lost('unsupported', 'large')
    const lines = body.split('\n')
    if (lines.at(-1) === '') lines.pop()
    return won(lines.map((line) => `+${line}\n`).join(''))
  }

  if (side === 'untracked') {
    const drawn = await fromDisk()
    if (drawn !== null) return drawn
  }

  const unstaged = ['diff', '--', path]
  const staged = ['diff', '--cached', '--', path]
  for (const args of side === 'staged' ? [staged, unstaged] : [unstaged, staged]) {
    const said = await ran(deps, at.value, args)
    if (!said.ok) return said
    if (said.value.length > DIFF_MAX) return lost('unsupported', 'large')
    if (said.value.length > 0) return said
  }

  if (side !== 'untracked') {
    // Neither side differs: a file the status has not caught up with yet is
    // still worth drawing whole; a genuinely unchanged file reads from git,
    // not the disk, so only the unknown one lands here with content.
    const tracked = await deps.git(['ls-files', '--error-unmatch', '--', path], at.value)
    if (tracked.code !== 0) {
      const drawn = await fromDisk()
      if (drawn !== null) return drawn
    }
  }
  return won('')
}

export async function gitStage(deps: GitDeps, path: string): Promise<Outcome<null>> {
  if (!tamePath(path)) return lost('refused', 'path')
  const at = await whereabouts(deps)
  if (!at.ok) return at
  const said = await ran(deps, at.value, ['add', '--', path])
  return said.ok ? won(null) : said
}

export async function gitUnstage(deps: GitDeps, path: string): Promise<Outcome<null>> {
  if (!tamePath(path)) return lost('refused', 'path')
  const at = await whereabouts(deps)
  if (!at.ok) return at
  const said = await ran(deps, at.value, ['restore', '--staged', '--', path])
  return said.ok ? won(null) : said
}

export async function gitCommit(deps: GitDeps, message: string): Promise<Outcome<null>> {
  if (message.trim().length === 0) return lost('refused', 'empty-message')
  const at = await whereabouts(deps)
  if (!at.ok) return at
  const said = await ran(deps, at.value, ['commit', '-m', message])
  return said.ok ? won(null) : said
}

export async function gitSwitch(
  deps: GitDeps,
  branch: string,
  create: boolean,
): Promise<Outcome<null>> {
  if (!BRANCH_NAME.test(branch)) return lost('refused', 'branch-name')
  const at = await whereabouts(deps)
  if (!at.ok) return at
  const args = create ? ['switch', '-c', branch] : ['switch', branch]
  const said = await ran(deps, at.value, args)
  return said.ok ? won(null) : said
}

export async function gitPush(deps: GitDeps): Promise<Outcome<null>> {
  const status = await gitStatus(deps)
  if (!status.ok) return status
  const at = await whereabouts(deps)
  if (!at.ok) return at
  const args =
    status.value.upstream === null ? ['push', '-u', 'origin', status.value.branch] : ['push']
  const said = await ran(deps, at.value, args)
  return said.ok ? won(null) : said
}

const SHA = /^[0-9a-f]{4,40}$/

// Past a megabyte the renderer draws for seconds; the pane says so instead.
const DIFF_MAX = 1_000_000

export async function gitGraph(deps: GitDeps): Promise<Outcome<GraphCommit[]>> {
  const at = await whereabouts(deps)
  if (!at.ok) return at
  const said = await ran(deps, at.value, [
    'log',
    // Branches, remotes and tags only: the stash is not history, and its
    // synthetic merge commits made the graph read as if it were.
    '--branches',
    '--remotes',
    '--tags',
    '--topo-order',
    '-n',
    '300',
    '--format=%H%x09%h%x09%P%x09%D%x09%an%x09%ae%x09%at%x09%s',
  ])
  // A repo with no commit yet has no graph, and that is an empty list.
  if (!said.ok) return won([])
  const commits = graphOf(said.value)
  const counted = await ran(deps, at.value, [
    'log',
    '--branches',
    '--remotes',
    '--tags',
    '--topo-order',
    '-n',
    '300',
    '--format=%H',
    '--shortstat',
  ])
  if (counted.ok) {
    const stats = statsOf(counted.value)
    for (const commit of commits) {
      const found = stats[commit.sha]
      if (found !== undefined) commit.stat = found
    }
  }
  return won(commits)
}

export async function gitShow(deps: GitDeps, sha: string): Promise<Outcome<ShownFile[]>> {
  if (!SHA.test(sha)) return lost('refused', 'sha')
  const at = await whereabouts(deps)
  if (!at.ok) return at
  const said = await ran(deps, at.value, ['show', '--format=', '--name-status', sha])
  return said.ok ? won(shownOf(said.value)) : said
}

export async function gitShowDiff(
  deps: GitDeps,
  sha: string,
  path: string,
): Promise<Outcome<string>> {
  if (!SHA.test(sha)) return lost('refused', 'sha')
  if (!tamePath(path)) return lost('refused', 'path')
  const at = await whereabouts(deps)
  if (!at.ok) return at
  const said = await ran(deps, at.value, ['show', '--format=', sha, '--', path])
  if (said.ok && said.value.length > DIFF_MAX) return lost('unsupported', 'large')
  return said
}

export async function gitMerge(deps: GitDeps, branch: string): Promise<Outcome<null>> {
  if (!BRANCH_NAME.test(branch)) return lost('refused', 'branch-name')
  const at = await whereabouts(deps)
  if (!at.ok) return at
  const said = await ran(deps, at.value, ['merge', '--no-edit', branch])
  return said.ok ? won(null) : said
}

export async function gitMergeAbort(deps: GitDeps): Promise<Outcome<null>> {
  const at = await whereabouts(deps)
  if (!at.ok) return at
  const said = await ran(deps, at.value, ['merge', '--abort'])
  return said.ok ? won(null) : said
}

const STASH_REF = /^stash@\{\d+\}$/

export async function gitStashList(deps: GitDeps): Promise<Outcome<GitStash[]>> {
  const at = await whereabouts(deps)
  if (!at.ok) return at
  const said = await ran(deps, at.value, ['stash', 'list', '--format=%gd%x09%s'])
  if (!said.ok) return won([])
  return won(
    said.value
      .split('\n')
      .filter((line) => line.includes('\t'))
      .map((line) => {
        const cut = line.indexOf('\t')
        return { ref: line.slice(0, cut), subject: line.slice(cut + 1) }
      }),
  )
}

export async function gitStashPush(deps: GitDeps): Promise<Outcome<null>> {
  const at = await whereabouts(deps)
  if (!at.ok) return at
  const said = await ran(deps, at.value, ['stash', 'push', '--include-untracked'])
  return said.ok ? won(null) : said
}

export async function gitStashApply(deps: GitDeps, ref: string): Promise<Outcome<null>> {
  if (!STASH_REF.test(ref)) return lost('refused', 'stash-ref')
  const at = await whereabouts(deps)
  if (!at.ok) return at
  const said = await ran(deps, at.value, ['stash', 'apply', ref])
  return said.ok ? won(null) : said
}

export async function gitStashDrop(deps: GitDeps, ref: string): Promise<Outcome<null>> {
  if (!STASH_REF.test(ref)) return lost('refused', 'stash-ref')
  const at = await whereabouts(deps)
  if (!at.ok) return at
  const said = await ran(deps, at.value, ['stash', 'drop', ref])
  return said.ok ? won(null) : said
}

const IMAGE_REF = /^(|HEAD|[0-9a-f]{4,40}\^?)$/
const IMAGE_MAX = 8 * 1024 * 1024

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  bmp: 'image/bmp',
}

export async function gitImage(deps: GitDeps, path: string, ref: string): Promise<Outcome<string>> {
  if (!tamePath(path)) return lost('refused', 'path')
  if (!IMAGE_REF.test(ref)) return lost('refused', 'ref')
  const mime = MIME[path.split('.').at(-1)?.toLowerCase() ?? '']
  if (mime === undefined) return lost('refused', 'not-an-image')
  const at = await whereabouts(deps)
  if (!at.ok) return at
  const bytes = await deps.blob(path, ref, at.value)
  if (bytes === null) return lost('failed', 'gone')
  if (bytes.length > IMAGE_MAX) return lost('unsupported', 'large')
  return won(`data:${mime};base64,${bytes.toString('base64')}`)
}

export async function gitPull(deps: GitDeps): Promise<Outcome<null>> {
  const at = await whereabouts(deps)
  if (!at.ok) return at
  const said = await ran(deps, at.value, ['pull', '--ff-only'])
  return said.ok ? won(null) : said
}

// The panel is told when anything under .git moves - a commit from a shell,
// an agent, a branch switch - so what it shows is never minutes old. The
// watcher follows the open project; a folder without .git simply has none.
let watching: { root: string; watcher: FSWatcher } | null = null
let tellSoon: NodeJS.Timeout | null = null

function followGit(root: string): void {
  if (watching?.root === root) return
  watching?.watcher.close()
  watching = null
  try {
    const watcher = watch(joinPath(root, '.git'), { recursive: true }, () => {
      if (tellSoon !== null) clearTimeout(tellSoon)
      tellSoon = setTimeout(() => {
        for (const win of BrowserWindow.getAllWindows()) {
          push(win.webContents, 'git:changed', null)
        }
      }, 300)
    })
    watching = { root, watcher }
  } catch {
    // No .git to follow; the next status read tries again.
  }
}

const liveDeps: GitDeps = {
  here: recallProject,
  // quotepath off: paths come back as the bytes on disk, not C-quoted octal.
  // no-optional-locks: a background read must not rewrite the index, or the
  // .git watcher would hear our own reading and spin.
  git: (args, cwd) => runGit(['-c', 'core.quotepath=false', '--no-optional-locks', ...args], cwd),
  read: (path) => readFile(path, 'utf8').catch(() => null),
  blob: async (path, ref, cwd) => {
    if (ref === '') return readFile(joinPath(cwd, path)).catch(() => null)
    // Through execFile with a buffer, since the shared runner narrates utf8.
    try {
      const { stdout } = await execFileAsync('git', ['show', `${ref}:${path}`], {
        cwd,
        encoding: 'buffer',
        maxBuffer: IMAGE_MAX + 1024,
        windowsHide: true,
      })
      return stdout
    } catch {
      return null
    }
  },
}

export function registerGitDesk(): void {
  handle('git:status', async () => {
    const here = await recallProject()
    if (here !== null) followGit(here)
    return gitStatus(liveDeps)
  })
  handle('git:branches', () => gitBranches(liveDeps))
  handle('git:log', () => gitLog(liveDeps))
  handle('git:diff', (_event, path, side) => gitDiff(liveDeps, path, side))
  handle('git:stage', (_event, path) => gitStage(liveDeps, path))
  handle('git:unstage', (_event, path) => gitUnstage(liveDeps, path))
  handle('git:commit', (_event, message) => gitCommit(liveDeps, message))
  handle('git:switch', (_event, branch, create) => gitSwitch(liveDeps, branch, create))
  handle('git:push', () => gitPush(liveDeps))
  handle('git:pull', () => gitPull(liveDeps))
  handle('git:merge', (_event, branch) => gitMerge(liveDeps, branch))
  handle('git:stash-list', () => gitStashList(liveDeps))
  handle('git:stash-push', () => gitStashPush(liveDeps))
  handle('git:stash-apply', (_event, ref) => gitStashApply(liveDeps, ref))
  handle('git:stash-drop', (_event, ref) => gitStashDrop(liveDeps, ref))
  handle('git:image', (_event, path, ref) => gitImage(liveDeps, path, ref))
  handle('git:merge-abort', () => gitMergeAbort(liveDeps))
  handle('git:graph', () => gitGraph(liveDeps))
  handle('git:show', (_event, sha) => gitShow(liveDeps, sha))
  handle('git:show-diff', (_event, sha, path) => gitShowDiff(liveDeps, sha, path))
}
