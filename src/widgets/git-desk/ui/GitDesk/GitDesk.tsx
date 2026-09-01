import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { i18n } from '@lingui/core'
import { t } from '@lingui/core/macro'
import {
  ArrowDown,
  ArrowLeft,
  Archive,
  ArrowUp,
  Circle,
  CircleCheck,
  GitBranch,
  GitMerge,
  Plus,
  RefreshCw,
  SquareArrowRight,
  SquareAsterisk,
  SquareDot,
  SquareMinus,
  SquarePlus,
  X,
} from 'lucide-react'
import type { GitFile, GitStat, ShownFile } from '@/entities/git/model/repo'
import { CHROME_TOP } from '@/shared/config/theme'
import { cn } from '@/shared/lib/cn'
import { diffHunks } from '@/shared/lib/diff/hunks/hunks'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Spinner } from '@/shared/ui/spinner'
import { Textarea } from '@/shared/ui/textarea'
import { laneRows } from '../../lib/graph/graph'
import type { LaneRow } from '../../lib/graph/graph.types'
import { useGitDesk } from '../../model/useGitDesk'

const ROW_H = 36
const LANE_W = 18
const MID = ROW_H / 2
const DOT_R = 9

function laneColor(lane: number): string {
  return `var(--lane-${lane % 8})`
}

function laneX(lane: number): number {
  return lane * LANE_W + LANE_W / 2 + 2
}

// GitHub answers an avatar for any email it knows, and a neutral identicon
// for one it does not - never somebody else's face.
function avatarUrl(email: string): string | null {
  if (email.length === 0 || !email.includes('@')) return null
  return `https://avatars.githubusercontent.com/u/e?email=${encodeURIComponent(email)}&s=36`
}

// The node is drawn the GitKraken way: a ring in the lane's color holding the
// author's GitHub avatar, or their initial while offline or unknowable.
function RowLines({
  row,
  initial,
  email,
  wip,
}: {
  row: LaneRow
  initial: string
  email: string
  wip: boolean
}) {
  const x = laneX(row.lane)
  const [broken, setBroken] = useState(false)
  const face = wip || broken ? null : avatarUrl(email)
  return (
    <svg
      width={row.width * LANE_W + 4}
      height={ROW_H}
      // The size- marker opts out of the Button's blanket size-4 on svgs.
      className="size-none flex-none"
      role="presentation"
      style={{ width: row.width * LANE_W + 4, height: ROW_H }}
    >
      {row.throughs.map((lane) => (
        <path
          key={`t${lane}`}
          d={`M ${laneX(lane)} 0 L ${laneX(lane)} ${ROW_H}`}
          stroke={laneColor(lane)}
          strokeWidth="2.5"
          fill="none"
        />
      ))}
      {row.up && (
        <path
          d={`M ${x} 0 L ${x} ${MID}`}
          stroke={laneColor(row.lane)}
          strokeWidth="2.5"
          fill="none"
        />
      )}
      {row.down && (
        <path
          d={`M ${x} ${MID} L ${x} ${ROW_H}`}
          stroke={laneColor(row.lane)}
          strokeWidth="2.5"
          fill="none"
          strokeDasharray={wip ? '3 4' : undefined}
        />
      )}
      {row.tops.map((lane) => (
        <path
          key={`m${lane}`}
          d={`M ${laneX(lane)} 0 C ${laneX(lane)} ${MID}, ${x} 6, ${x} ${MID}`}
          stroke={laneColor(lane)}
          strokeWidth="2.5"
          fill="none"
        />
      ))}
      {row.bottoms.map((lane) => (
        <path
          key={`b${lane}`}
          d={`M ${x} ${MID} C ${x} ${ROW_H - 6}, ${laneX(lane)} ${MID}, ${laneX(lane)} ${ROW_H}`}
          stroke={laneColor(lane)}
          strokeWidth="2.5"
          fill="none"
        />
      ))}
      <circle
        cx={x}
        cy={MID}
        r={DOT_R}
        fill="var(--card)"
        stroke={laneColor(row.lane)}
        strokeWidth="2.5"
        strokeDasharray={wip ? '3 3' : undefined}
      />
      {!wip && face === null && (
        <text
          x={x}
          y={MID + 3.5}
          textAnchor="middle"
          fontSize="10"
          fontWeight="600"
          fill={laneColor(row.lane)}
        >
          {initial}
        </text>
      )}
      {face !== null && (
        <>
          <clipPath id={`face-${row.sha}`}>
            <circle cx={x} cy={MID} r={DOT_R - 1.5} />
          </clipPath>
          <image
            href={face}
            x={x - (DOT_R - 1.5)}
            y={MID - (DOT_R - 1.5)}
            width={(DOT_R - 1.5) * 2}
            height={(DOT_R - 1.5) * 2}
            clipPath={`url(#face-${row.sha})`}
            onError={() => setBroken(true)}
          />
        </>
      )}
    </svg>
  )
}

// A solid GitKraken-style label pill: lane color ground, ground-colored text.
function RefPill({ name, lane }: { name: string; lane: number }) {
  return (
    <span
      className="min-w-0 shrink truncate rounded-md px-1.5 py-0.5 font-medium font-mono text-xs text-background leading-none"
      style={{ backgroundColor: laneColor(lane) }}
      title={name}
    >
      {name}
    </span>
  )
}

// GitKraken's changes cell: a file count and a green/red bar sized to how
// much came and went, on a square-root scale so one huge commit does not
// flatten every other bar.
function ChangeBar({ stat }: { stat: GitStat }) {
  if (stat.files === 0) return null
  const total = stat.adds + stat.dels
  const span = Math.min(72, Math.max(6, Math.round(Math.sqrt(total) * 6)))
  const added = total === 0 ? 0 : Math.round((span * stat.adds) / total)
  return (
    <span className="flex items-center gap-2">
      <span className="w-6 text-right font-mono text-muted-foreground text-xs">{stat.files}</span>
      <span className="flex h-2 overflow-hidden rounded-sm" style={{ width: span }}>
        <span className="h-full bg-added" style={{ width: added }} />
        <span className="h-full flex-1 bg-removed" />
      </span>
    </span>
  )
}

function whenLabel(at: number): string {
  if (at <= 0) return ''
  const sameDay = new Date(at).toDateString() === new Date().toDateString()
  return new Intl.DateTimeFormat(
    i18n.locale,
    sameDay
      ? { hour: '2-digit', minute: '2-digit', hour12: false }
      : { month: 'numeric', day: 'numeric' },
  ).format(at)
}

// The change marks GitHub Desktop wears: a green plus for what is new, a
// gold dot for what changed, a red minus for what left, a blue arrow for
// what moved. The letter survives as the tooltip.
function SignMark({ sign }: { sign: string }) {
  const drawn =
    sign === 'A' || sign === '?'
      ? { Icon: SquarePlus, color: 'var(--added)', name: t`Added` }
      : sign === 'M'
        ? { Icon: SquareDot, color: 'var(--kind-feedback)', name: t`Modified` }
        : sign === 'D'
          ? { Icon: SquareMinus, color: 'var(--removed)', name: t`Deleted` }
          : sign === 'R' || sign === 'C'
            ? { Icon: SquareArrowRight, color: 'var(--kind-project)', name: t`Renamed` }
            : sign === 'U'
              ? { Icon: SquareAsterisk, color: 'var(--destructive)', name: t`Conflicted` }
              : { Icon: SquareAsterisk, color: 'var(--muted-foreground)', name: sign }
  const { Icon } = drawn
  return (
    <span title={drawn.name} className="flex-none" style={{ color: drawn.color }}>
      <Icon className="size-3.5" />
    </span>
  )
}

function FileRow({
  path,
  sign,
  lead,
  active = false,
  onShow,
}: {
  path: string
  sign: string
  lead?: ReactNode
  active?: boolean
  onShow(): void
}) {
  return (
    <li className="flex items-center gap-1" data-git-file={path}>
      {lead}
      <Button
        variant="ghost"
        size="xs"
        onClick={onShow}
        aria-pressed={active}
        className={cn(
          'h-auto min-w-0 flex-1 justify-start gap-2 rounded-lg px-1.5 py-1 font-normal',
          active && 'bg-accent',
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left font-mono text-xs">{path}</span>
        <SignMark sign={sign} />
      </Button>
    </li>
  )
}

function StageMark({
  file,
  busy,
  onPick,
}: {
  file: GitFile
  busy: boolean
  onPick(next: boolean): void
}) {
  const staged = file.staged && !file.unstaged
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      disabled={busy}
      onClick={() => onPick(!staged)}
      aria-pressed={staged}
      aria-label={t`Stage ${file.path}`}
      className="flex-none rounded-lg"
    >
      {staged ? (
        <CircleCheck className="text-added" />
      ) : (
        <Circle className="text-muted-foreground" />
      )}
    </Button>
  )
}

function ColumnHead({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'whitespace-nowrap font-medium text-muted-foreground text-xs tracking-[0.1em]',
        className,
      )}
    >
      {children}
    </span>
  )
}

// The columns give way in order as the window narrows: the author first,
// then the change bars; the label column and the right panel shrink too.
const REFS_COL = 'w-28 flex-none xl:w-48'
const CHANGES_COL = 'w-32 flex-none max-lg:hidden'
const AUTHOR_COL = 'w-24 flex-none max-xl:hidden'
const SHA_COL = 'w-14 flex-none'
const WHEN_COL = 'w-12 flex-none'

export function GitDesk({ project }: { project: string | null }) {
  const git = useGitDesk(project)
  const [newBranch, setNewBranch] = useState('')
  // A branch picked in the selector waits behind a confirmation: switching
  // rewrites the working tree, too much for one unnoticed click.
  const [switching, setSwitching] = useState<string | null>(null)
  const [merging, setMerging] = useState(false)
  const [mergeFrom, setMergeFrom] = useState<string | null>(null)
  const [droppingStash, setDroppingStash] = useState<string | null>(null)

  const { open, diff, close, closeDiff } = git
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      if (diff !== null) closeDiff()
      else close()
    }
    // Any other titlebar control (settings, the sidebar toggle) acts on the
    // workspace underneath; the view steps aside instead of hiding the result.
    const onPress = (event: MouseEvent): void => {
      const hit = event.target as Element | null
      if (hit?.closest('[data-titlebar]') && !hit.closest('[data-git-button]')) close()
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('click', onPress, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('click', onPress, true)
    }
  }, [open, diff, close, closeDiff])

  const dirty = git.status !== null && git.status.files.length > 0

  // The WIP row sits right above the checked-out commit, in its lane, its
  // line dashed: work not yet a commit, drawn where it will land.
  const rows = useMemo(() => {
    const laid = laneRows(git.graph)
    const out = laid.map((row, i) => ({ row, commit: git.graph[i] ?? null }))
    const at = git.graph.findIndex((one) => one.head)
    const head = at < 0 ? undefined : laid[at]
    if (!dirty || head === undefined) return out
    const wip: LaneRow = {
      sha: 'wip',
      lane: head.lane,
      up: false,
      down: true,
      tops: [],
      bottoms: [],
      throughs: [...head.throughs, ...head.tops],
      width: head.width,
    }
    out.splice(at, 0, { row: wip, commit: null })
    return out
  }, [git.graph, dirty])

  if (project === null) return null

  const branchName = git.status?.branch ?? ''
  const picked = git.pick.kind === 'commit' ? git.pick.sha : null
  const pickedCommit =
    picked === null ? null : (git.graph.find((one) => one.sha === picked) ?? null)

  return (
    <>
      <Button
        variant="quiet"
        size="bare"
        onClick={git.toggle}
        aria-pressed={git.open}
        className="zt-hit flex items-center gap-1 text-xs"
        title={t`Branches, changes, commits`}
        data-git-button
      >
        <GitBranch className="size-3" />
        {branchName.length > 0 ? branchName : 'Git'}
      </Button>
      {git.open &&
        // A portal: the button lives in the titlebar, whose stacking context
        // would otherwise put this surface over the titlebar's own buttons.
        createPortal(
          <div
            data-git-drawer
            className="fixed inset-0 z-[4] flex flex-col bg-background"
            style={{ paddingTop: CHROME_TOP }}
          >
            <div className="flex flex-none items-center gap-2 border-border border-b px-4 py-2">
              <GitBranch className="size-3.5 flex-none text-muted-foreground" />
              <Select
                value={branchName}
                onValueChange={(next) => {
                  if (next !== branchName) setSwitching(next)
                }}
                disabled={git.busy}
              >
                <SelectTrigger size="sm" className="w-52" data-git-branches>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {git.branches.map((branch) => (
                    <SelectItem key={branch.name} value={branch.name}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={newBranch}
                onChange={(event) => setNewBranch(event.target.value)}
                placeholder={t`New branch name`}
                aria-label={t`New branch name`}
                className="h-8 w-44 text-sm"
              />
              <Button
                variant="outline"
                size="xs"
                disabled={git.busy || newBranch.trim().length === 0}
                onClick={() => {
                  git.createBranch(newBranch.trim())
                  setNewBranch('')
                }}
                className="rounded-lg"
              >
                <Plus />
                {t`Create`}
              </Button>
              <Button
                variant="ghost"
                size="xs"
                disabled={git.busy || git.branches.length < 2}
                onClick={() => {
                  setMergeFrom(null)
                  setMerging(true)
                }}
                className="rounded-lg text-muted-foreground"
                data-git-merge
              >
                <GitMerge />
                {t`Merge`}
              </Button>
              <span className="flex-1" />
              {git.busy && <Spinner className="size-3.5" />}
              <Button
                variant="ghost"
                size="xs"
                disabled={git.busy}
                onClick={git.pull}
                className="rounded-lg text-muted-foreground"
              >
                <ArrowDown />
                {t`Pull`}
                {git.status !== null && git.status.behind > 0 && (
                  <span className="font-mono">{git.status.behind}</span>
                )}
              </Button>
              <Button
                variant="ghost"
                size="xs"
                disabled={git.busy}
                onClick={git.push}
                className="rounded-lg text-muted-foreground"
              >
                <ArrowUp />
                {t`Push`}
                {git.status !== null && git.status.ahead > 0 && (
                  <span className="font-mono">{git.status.ahead}</span>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={git.refresh}
                disabled={git.busy}
                aria-label={t`Refresh`}
                className="rounded-lg text-muted-foreground"
              >
                <RefreshCw />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={git.close}
                aria-label={t`Close`}
                className="rounded-lg text-muted-foreground"
              >
                <X />
              </Button>
            </div>

            {git.noRepo ? (
              <p className="p-6 text-muted-foreground text-sm">{t`This project is not a git repository.`}</p>
            ) : (
              <div className="flex min-h-0 flex-1">
                {git.diff !== null ? (
                  // The code takes the whole main area: a 380px side panel cuts
                  // every line of source; the file list stays on the right.
                  <div className="flex min-w-0 flex-1 flex-col gap-3 p-4" data-git-diff>
                    <div className="flex flex-none items-center gap-2">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={git.closeDiff}
                        className="rounded-lg"
                      >
                        <ArrowLeft />
                        {t`Back`}
                      </Button>
                      <span className="min-w-0 flex-1 truncate font-mono text-xs">
                        {git.diff.path}
                      </span>
                    </div>
                    {git.diff.image !== null ? (
                      <div
                        className="zt-scroll flex min-h-0 flex-1 items-start justify-center gap-6 overflow-auto rounded-lg border border-border bg-card p-6"
                        data-git-image
                      >
                        {git.diff.image.before !== null && (
                          <figure className="flex min-w-0 flex-col items-center gap-2">
                            <img
                              src={git.diff.image.before}
                              alt={t`Before`}
                              className="max-h-[60vh] rounded-md border border-removed/40"
                            />
                            <figcaption className="text-muted-foreground text-xs">
                              {t`Before`}
                            </figcaption>
                          </figure>
                        )}
                        {git.diff.image.after !== null && (
                          <figure className="flex min-w-0 flex-col items-center gap-2">
                            <img
                              src={git.diff.image.after}
                              alt={t`After`}
                              className="max-h-[60vh] rounded-md border border-added/40"
                            />
                            <figcaption className="text-muted-foreground text-xs">
                              {t`After`}
                            </figcaption>
                          </figure>
                        )}
                        {git.diff.image.before === null && git.diff.image.after === null && (
                          <p className="text-muted-foreground text-sm">{t`Could not read that image.`}</p>
                        )}
                      </div>
                    ) : git.diff.trouble !== null ? (
                      <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-border bg-card">
                        <p className="text-muted-foreground text-sm" data-git-diff-trouble>
                          {git.diff.trouble === 'binary'
                            ? t`A binary file has no diff to show.`
                            : git.diff.trouble === 'large'
                              ? t`This diff is too large to show here.`
                              : t`Could not read that diff`}
                        </p>
                      </div>
                    ) : (
                      <div
                        data-selectable
                        className="zt-scroll min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card py-1 font-mono text-xs leading-relaxed"
                      >
                        {diffHunks(git.diff.text).map((hunk, at) => (
                          <div key={hunk.header.length > 0 ? hunk.header : `hunk-${at * 2}`}>
                            {hunk.header.length > 0 && (
                              <div className="w-max min-w-full select-none border-border/60 border-y bg-muted/40 px-3 py-1 text-muted-foreground">
                                {hunk.header}
                              </div>
                            )}
                            {hunk.lines.map((row) => (
                              <div
                                key={`${row.oldNo ?? ''}:${row.newNo ?? ''}`}
                                className={cn(
                                  'flex w-max min-w-full',
                                  row.kind === 'added' && 'bg-added-surface',
                                  row.kind === 'removed' && 'bg-removed-surface',
                                )}
                              >
                                <span className="w-10 flex-none select-none pr-2 text-right text-muted-foreground">
                                  {row.oldNo}
                                </span>
                                <span className="w-10 flex-none select-none pr-2 text-right text-muted-foreground">
                                  {row.newNo}
                                </span>
                                <span
                                  className={cn(
                                    'w-5 flex-none select-none text-center',
                                    row.kind === 'added' && 'text-added',
                                    row.kind === 'removed' && 'text-removed',
                                  )}
                                >
                                  {row.kind === 'added' ? '+' : row.kind === 'removed' ? '-' : ''}
                                </span>
                                <span className="flex-1 whitespace-pre pr-3">{row.text}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                        {git.diff.text.length === 0 ? (
                          <p className="px-3 py-1 text-muted-foreground">{t`Nothing differs on this side.`}</p>
                        ) : (
                          diffHunks(git.diff.text).length === 0 && (
                            // A binary or submodule change has no lines; what git
                            // said about it is the whole story.
                            <p className="whitespace-pre-wrap px-3 py-1 text-muted-foreground">
                              {git.diff.text.trim()}
                            </p>
                          )
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex flex-none items-center gap-3 border-border border-b px-4 py-1.5">
                      <span className={cn(REFS_COL, 'text-right')}>
                        <ColumnHead>{t`Branch / tag`}</ColumnHead>
                      </span>
                      <span
                        className="flex-none"
                        style={{ width: (rows[0]?.row.width ?? 1) * LANE_W + 4 }}
                      >
                        <ColumnHead>{t`Graph`}</ColumnHead>
                      </span>
                      <span className="min-w-16 flex-1">
                        <ColumnHead>{t`Commit message`}</ColumnHead>
                      </span>
                      <span className={CHANGES_COL}>
                        <ColumnHead>{t`Changes`}</ColumnHead>
                      </span>
                      <span className={AUTHOR_COL}>
                        <ColumnHead>{t`Author`}</ColumnHead>
                      </span>
                      <span className={SHA_COL}>
                        <ColumnHead>{t`Commit`}</ColumnHead>
                      </span>
                      <span className={WHEN_COL} />
                    </div>
                    {!git.ready ? (
                      <ul className="flex-1 animate-pulse py-1" data-git-loading>
                        {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n'].map(
                          (slot, at) => (
                            <li
                              key={slot}
                              className="flex items-center gap-3 px-4"
                              style={{ height: ROW_H }}
                            >
                              <span className={REFS_COL} />
                              <span className="size-4 flex-none rounded-full bg-muted" />
                              <span
                                className="h-3 rounded bg-muted"
                                style={{ width: `${30 + ((at * 23) % 45)}%` }}
                              />
                            </li>
                          ),
                        )}
                      </ul>
                    ) : rows.length === 0 ? (
                      <p className="p-6 text-muted-foreground text-sm">
                        {t`No commits here yet. The graph starts with the first one.`}
                      </p>
                    ) : (
                      <ul className="zt-scroll min-w-0 flex-1 overflow-y-auto py-1" data-git-graph>
                        {rows.map(({ row, commit }) => {
                          const wip = commit === null
                          const chosen = wip ? git.pick.kind === 'wip' : picked === commit.sha
                          const spare = wip ? [] : commit.refs
                          return (
                            <li key={row.sha}>
                              <Button
                                variant="ghost"
                                size="bare"
                                onClick={() => (wip ? git.pickWip() : git.pickCommit(commit.sha))}
                                aria-pressed={chosen}
                                className={cn(
                                  'flex w-full items-center gap-3 rounded-none px-4 font-normal',
                                  // Not yet a commit: the row wears a dashed
                                  // seam so it cannot pass for history.
                                  wip && 'border-y border-dashed border-border bg-muted/20',
                                  chosen && 'bg-accent',
                                )}
                                style={{ height: ROW_H }}
                                data-git-row={row.sha}
                              >
                                <span
                                  className={cn(
                                    REFS_COL,
                                    'flex items-center justify-end gap-1 overflow-hidden',
                                  )}
                                >
                                  {spare.slice(0, 2).map((name) => (
                                    <RefPill key={name} name={name} lane={row.lane} />
                                  ))}
                                  {spare.length > 2 && (
                                    <span
                                      className="flex-none rounded-md px-1.5 py-0.5 font-medium font-mono text-xs text-background leading-none"
                                      style={{ backgroundColor: laneColor(row.lane) }}
                                      title={spare.slice(2).join(', ')}
                                    >
                                      +{spare.length - 2}
                                    </span>
                                  )}
                                </span>
                                <RowLines
                                  row={row}
                                  wip={wip}
                                  email={wip ? '' : commit.email}
                                  initial={wip ? '' : (commit.author[0]?.toUpperCase() ?? '·')}
                                />
                                {wip ? (
                                  <span className="min-w-0 flex-1 truncate text-left text-muted-foreground text-sm italic">
                                    {t`Uncommitted changes`}
                                    {git.status !== null && ` · ${git.status.files.length}`}
                                  </span>
                                ) : (
                                  <>
                                    <span
                                      className="min-w-16 flex-1 truncate text-left text-sm"
                                      title={commit.subject}
                                    >
                                      {commit.subject}
                                    </span>
                                    <span className={CHANGES_COL}>
                                      <ChangeBar stat={commit.stat} />
                                    </span>
                                    <span
                                      className={cn(
                                        AUTHOR_COL,
                                        'truncate text-left text-muted-foreground text-xs',
                                      )}
                                      title={commit.author}
                                    >
                                      {commit.author}
                                    </span>
                                    <span
                                      className={cn(
                                        SHA_COL,
                                        'text-left font-mono text-muted-foreground text-xs',
                                      )}
                                    >
                                      {commit.short}
                                    </span>
                                    <span
                                      className={cn(
                                        WHEN_COL,
                                        'text-right text-muted-foreground text-xs tabular-nums',
                                      )}
                                    >
                                      {whenLabel(commit.at)}
                                    </span>
                                  </>
                                )}
                              </Button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )}

                <div className="flex w-80 flex-none flex-col gap-3 border-border border-l p-4 xl:w-96">
                  {git.pick.kind === 'wip' ? (
                    <>
                      <h3 className="flex-none text-muted-foreground text-xs tracking-[0.08em]">
                        {t`Changes`}
                      </h3>
                      {git.status !== null && git.status.files.length === 0 ? (
                        <p className="text-muted-foreground text-sm">{t`Nothing has changed.`}</p>
                      ) : (
                        <ul className="zt-scroll min-h-0 flex-1 overflow-y-auto" data-git-files>
                          {git.status?.files.map((file) => (
                            <FileRow
                              key={file.path}
                              path={file.path}
                              sign={file.sign}
                              active={git.diff?.path === file.path}
                              lead={
                                <StageMark
                                  file={file}
                                  busy={git.busy}
                                  onPick={(next) => (next ? git.stage(file) : git.unstage(file))}
                                />
                              }
                              onShow={() => git.showDiff(file)}
                            />
                          ))}
                        </ul>
                      )}
                      <Textarea
                        value={git.message}
                        onChange={(event) => git.setMessage(event.target.value)}
                        placeholder={t`Commit message`}
                        aria-label={t`Commit message`}
                        className="h-20 flex-none resize-none bg-card p-2 text-sm"
                      />
                      <Button
                        variant="outline"
                        size="xs"
                        disabled={
                          git.busy ||
                          git.message.trim().length === 0 ||
                          git.status?.files.some((file) => file.staged) !== true
                        }
                        onClick={git.commit}
                        className="flex-none self-start rounded-lg"
                        data-git-commit
                      >
                        {t`Commit staged files`}
                      </Button>
                      <div className="flex flex-none flex-col gap-1.5 border-border border-t pt-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-muted-foreground text-xs tracking-[0.08em]">
                            {t`Stash`}
                          </h3>
                          <Button
                            variant="ghost"
                            size="xs"
                            disabled={git.busy || git.status?.files.length === 0}
                            onClick={git.stashPush}
                            className="rounded-lg text-muted-foreground"
                            data-git-stash-push
                          >
                            <Archive />
                            {t`Stash changes`}
                          </Button>
                        </div>
                        {git.stashes.length === 0 ? (
                          <p className="text-muted-foreground text-xs">{t`Nothing stashed.`}</p>
                        ) : (
                          <ul className="flex max-h-32 flex-col overflow-y-auto" data-git-stashes>
                            {git.stashes.map((held) => (
                              <li
                                key={held.ref}
                                className="flex items-center gap-1"
                                data-git-stash={held.ref}
                              >
                                <span
                                  className="min-w-0 flex-1 truncate text-muted-foreground text-xs"
                                  title={held.subject}
                                >
                                  {held.subject}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  disabled={git.busy}
                                  onClick={() => git.stashApply(held.ref)}
                                  className="flex-none rounded-lg text-muted-foreground"
                                >
                                  {t`Apply`}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  disabled={git.busy}
                                  onClick={() => setDroppingStash(held.ref)}
                                  aria-label={t`Drop this stash`}
                                  className="flex-none rounded-lg text-muted-foreground"
                                >
                                  <X />
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {pickedCommit !== null && (
                        <div
                          className="flex flex-none flex-col gap-1"
                          data-git-commit-meta
                          data-selectable
                        >
                          <p className="text-sm leading-snug">{pickedCommit.subject}</p>
                          <p className="text-muted-foreground text-xs">
                            {pickedCommit.author} ·{' '}
                            {new Intl.DateTimeFormat(i18n.locale, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            }).format(pickedCommit.at)}
                          </p>
                          <p className="font-mono text-muted-foreground text-xs">
                            {pickedCommit.short}
                          </p>
                        </div>
                      )}
                      <h3 className="flex-none text-muted-foreground text-xs tracking-[0.08em]">
                        {t`Files in this commit`}
                      </h3>
                      <ul className="zt-scroll min-h-0 flex-1 overflow-y-auto" data-git-shown>
                        {git.shown.map((file: ShownFile) => (
                          <FileRow
                            key={file.path}
                            path={file.path}
                            sign={file.sign}
                            active={git.diff?.path === file.path}
                            onShow={() => git.showCommitDiff(file)}
                          />
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            )}
            <AlertDialog
              open={droppingStash !== null}
              onOpenChange={(kept) => {
                if (!kept) setDroppingStash(null)
              }}
            >
              <AlertDialogContent data-git-stash-confirm>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t`Drop this stash?`}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t`What it holds is gone for good. Applying it first keeps the work.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t`Keep it`}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (droppingStash !== null) git.stashDrop(droppingStash)
                      setDroppingStash(null)
                    }}
                  >
                    {t`Drop`}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={merging} onOpenChange={setMerging}>
              <AlertDialogContent data-git-merge-confirm>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t`Merge a branch into ${branchName}`}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t`The picked branch's commits join this one. If the sides collide, the conflicted files stay in the list to resolve or abort.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Select value={mergeFrom ?? ''} onValueChange={setMergeFrom}>
                  <SelectTrigger size="sm" className="w-full" data-git-merge-pick>
                    <SelectValue placeholder={t`Pick a branch`} />
                  </SelectTrigger>
                  <SelectContent>
                    {git.branches
                      .filter((one) => !one.current)
                      .map((one) => (
                        <SelectItem key={one.name} value={one.name}>
                          {one.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t`Not now`}</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={mergeFrom === null}
                    onClick={() => {
                      if (mergeFrom !== null) git.merge(mergeFrom)
                      setMerging(false)
                    }}
                  >
                    {t`Merge`}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog
              open={switching !== null}
              onOpenChange={(kept) => {
                if (!kept) setSwitching(null)
              }}
            >
              <AlertDialogContent data-git-switch-confirm>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t`Switch to ${switching ?? ''}?`}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t`The working tree changes to that branch's files. Uncommitted changes come along if they do not collide.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t`Stay here`}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (switching !== null) git.switchTo(switching)
                      setSwitching(null)
                    }}
                  >
                    {t`Switch branch`}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>,
          document.body,
        )}
    </>
  )
}
