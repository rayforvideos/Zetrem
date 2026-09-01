import { useCallback, useEffect, useState } from 'react'
import { t } from '@lingui/core/macro'
import { toast } from 'sonner'
import type {
  GitBranch,
  GitFile,
  GitStatus,
  GraphCommit,
  ShownFile,
} from '@/entities/git/model/repo'
import type { Outcome } from '@/shared/lib/outcome/outcome.types'
import { lastLine } from '@/shared/lib/ask/ask'
import { sideOf } from '../lib/side/side'

// A diff view is opened even when the reading failed: the trouble shows in
// the pane where the code would be, never as a stray line elsewhere.
type Diff = { path: string; text: string; trouble: null | 'binary' | 'large' | 'failed' }

// What the right panel talks about: the working tree, or one commit.
type Pick = { kind: 'wip' } | { kind: 'commit'; sha: string }

type GitDesk = {
  open: boolean
  // False until the graph has answered once for this project.
  ready: boolean
  toggle(): void
  close(): void
  status: GitStatus | null
  noRepo: boolean
  branches: GitBranch[]
  graph: GraphCommit[]
  pick: Pick
  pickWip(): void
  pickCommit(sha: string): void
  shown: ShownFile[]
  diff: Diff | null
  message: string
  setMessage(next: string): void
  busy: boolean
  refresh(): void
  showDiff(file: GitFile): void
  showCommitDiff(file: ShownFile): void
  closeDiff(): void
  stage(file: GitFile): void
  unstage(file: GitFile): void
  commit(): void
  switchTo(branch: string): void
  createBranch(name: string): void
  push(): void
  pull(): void
}

// The view reads the repo when it opens and after each act; nothing polls.
// The status alone is also read closed, so the titlebar can name the branch.
export function useGitDesk(project: string | null): GitDesk {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<GitStatus | null>(null)
  const [noRepo, setNoRepo] = useState(false)
  const [branches, setBranches] = useState<GitBranch[]>([])
  const [graph, setGraph] = useState<GraphCommit[]>([])
  const [ready, setReady] = useState(false)
  const [pick, setPick] = useState<Pick>({ kind: 'wip' })
  const [shown, setShown] = useState<ShownFile[]>([])
  const [diff, setDiff] = useState<Diff | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const readStatus = useCallback((): void => {
    void window.desk
      .gitStatus()
      .catch(() => null)
      .then((got) => {
        if (got === null || !got.ok) {
          setStatus(null)
          setNoRepo(got !== null && got.why.said === 'no-repo')
          return
        }
        setNoRepo(false)
        setStatus(got.value)
      })
  }, [])

  const readAround = useCallback((): void => {
    readStatus()
    void window.desk
      .gitBranches()
      .catch(() => null)
      .then((got) => setBranches(got?.ok ? got.value : []))
    void window.desk
      .gitGraph()
      .catch(() => null)
      .then((got) => {
        setGraph(got?.ok ? got.value : [])
        setReady(true)
      })
  }, [readStatus])

  useEffect(() => {
    setOpen(false)
    setDiff(null)
    setMessage('')
    setPick({ kind: 'wip' })
    setGraph([])
    setReady(false)
    if (project === null) {
      setStatus(null)
      setNoRepo(false)
      return
    }
    readStatus()
  }, [project, readStatus])

  useEffect(() => {
    if (open) readAround()
  }, [open, readAround])

  // The commit panel's file list follows whichever commit is picked.
  useEffect(() => {
    if (pick.kind !== 'commit') {
      setShown([])
      return
    }
    void window.desk
      .gitShow(pick.sha)
      .catch(() => null)
      .then((got) => setShown(got?.ok ? got.value : []))
  }, [pick])

  function toggle(): void {
    setOpen((was) => !was)
  }

  function close(): void {
    setOpen(false)
    setDiff(null)
  }

  // One act at a time: run it, toast what went wrong, and re-read the repo.
  function act(run: () => Promise<Outcome<null>>, then?: () => void): void {
    setBusy(true)
    void run()
      .catch(() => null)
      .then((got) => {
        setBusy(false)
        if (got === null || !got.ok) {
          const why = got === null ? null : got.why
          toast.error(
            why?.said === 'branch-name'
              ? t`That branch name will not do.`
              : why?.code === 'cli' && /nothing (added )?to commit|no changes added/.test(why.said)
                ? t`Nothing is staged to commit.`
                : why?.code === 'cli' && why.said.length > 0
                  ? lastLine(why.said)
                  : t`Git could not do that`,
          )
          return
        }
        then?.()
        readAround()
      })
  }

  function tell(read: Promise<Outcome<string>>, path: string): void {
    void read
      .catch(() => null)
      .then((got) => {
        if (got === null || !got.ok) {
          const why = got === null ? null : got.why.said
          setDiff({
            path,
            text: '',
            trouble: why === 'binary' || why === 'large' ? why : 'failed',
          })
          return
        }
        setDiff({ path, text: got.value, trouble: null })
      })
  }

  return {
    open,
    ready,
    toggle,
    close,
    status,
    noRepo,
    branches,
    graph,
    pick,
    pickWip: () => {
      setPick({ kind: 'wip' })
      setDiff(null)
    },
    pickCommit: (sha) => {
      setPick({ kind: 'commit', sha })
      setDiff(null)
    },
    shown,
    diff,
    message,
    setMessage,
    busy,
    refresh: readAround,
    showDiff: (file) => tell(window.desk.gitDiff(file.path, sideOf(file)), file.path),
    showCommitDiff: (file) => {
      if (pick.kind === 'commit') tell(window.desk.gitShowDiff(pick.sha, file.path), file.path)
    },
    closeDiff: () => setDiff(null),
    stage: (file) => act(() => window.desk.gitStage(file.path)),
    unstage: (file) => act(() => window.desk.gitUnstage(file.path)),
    commit: () =>
      act(
        () => window.desk.gitCommit(message),
        () => setMessage(''),
      ),
    switchTo: (branch) =>
      act(
        () => window.desk.gitSwitch(branch, false),
        () => setDiff(null),
      ),
    createBranch: (name) =>
      act(
        () => window.desk.gitSwitch(name, true),
        () => setDiff(null),
      ),
    push: () => act(() => window.desk.gitPush()),
    pull: () => act(() => window.desk.gitPull()),
  }
}
