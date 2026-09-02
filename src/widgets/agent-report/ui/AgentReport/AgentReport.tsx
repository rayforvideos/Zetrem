import type { AgentSession } from '@/entities/agent-session'
import { useScrollState } from '@/shared/lib/scroll-state/useScrollState'
import { tally } from '@/entities/tool'
import { AgentSprite, personaOf } from '@/entities/teammate'
import { cn } from '@/shared/lib/cn'
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
import { Markdown } from '@/shared/markdown/Markdown/Markdown'
import { leadOf } from '../../lib/lead/lead'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { runsOf, stepTo } from '../../lib/runs/runs'
import { rollbackTitle, rollbackWarning } from '../../lib/review/review'
import type { DiffTone } from '../../lib/review/review.types'
import { stateWord } from '../../lib/state-word/state-word'
import { useWorktreeReview } from '../../model/useWorktreeReview'
import { CallStream } from '../CallStream/CallStream'
import { HelperList } from '../HelperList/HelperList'
import { t } from '@lingui/core/macro'

const TONE: Record<DiffTone, string> = {
  added: 'text-added',
  removed: 'text-removed',
  meta: 'text-muted-foreground',
  plain: '',
}

type AgentReportProps = {
  session: AgentSession
  sessions: AgentSession[]
  // The subagents this teammate called in. They have no report of their own,
  // so what they came back with is read here.
  helpers: AgentSession[]
  nowMs: number
  onClose(): void
  onPick(id: string): void
}

export function AgentReport({
  session,
  sessions,
  helpers,
  nowMs,
  onClose,
  onPick,
}: AgentReportProps) {
  const [body] = useScrollState<HTMLDivElement>()
  const runs = runsOf(sessions, session)
  const at = runs.findIndex((run) => run.id === session.id)
  const earlier = stepTo(runs, at, -1)
  const later = stepTo(runs, at, 1)
  const persona = personaOf(session.subagentType || session.label)
  const counted = tally(session.stream.map((call) => call.line))
  const ranMs = (session.endedAtMs ?? nowMs) - session.startedAtMs
  const lead = leadOf(session.headline, session.transcript)
  const review = useWorktreeReview(session.agentId)

  return (
    <div
      ref={body}
      data-report
      data-selectable
      className="zt-scroll zt-fade-y flex min-h-0 flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto pr-2.5 pb-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <AgentSprite
            subagentType={session.subagentType || session.label}
            state={session.status}
            size={44}
          />
          <span className="flex flex-col">
            <span className="text-base leading-tight">{persona.name}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {stateWord(session.status)} · {Math.max(0, Math.round(ranMs / 1000))}s ·{' '}
              {session.model}
            </span>
          </span>
        </div>
        <div className="flex flex-none items-center gap-3">
          {runs.length > 1 && (
            <span
              data-runs
              className="flex items-center gap-1 font-mono text-xs text-muted-foreground"
            >
              <Button
                variant="quiet"
                size="bare"
                disabled={earlier === null}
                onClick={() => earlier !== null && onPick(earlier)}
                aria-label={t`Earlier run`}
                className="zt-hit"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="tabular-nums">{t`run ${at + 1} of ${runs.length}`}</span>
              <Button
                variant="quiet"
                size="bare"
                disabled={later === null}
                onClick={() => later !== null && onPick(later)}
                aria-label={t`Later run`}
                className="zt-hit"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </span>
          )}
          <Button variant="quiet" size="bare" onClick={onClose} aria-label={t`Close report`}>
            {t`Close`}
          </Button>
        </div>
      </div>

      {lead !== null && <Markdown text={lead} className="text-sm leading-relaxed" />}

      <dl className="flex gap-6 font-mono text-xs tabular-nums">
        {[
          { word: t`Read`, count: counted.read },
          { word: t`Edited`, count: counted.wrote },
          { word: t`Ran`, count: counted.ran },
          { word: t`Searched`, count: counted.searched },
        ]
          .filter((one) => one.count > 0)
          .map((one) => (
            <span key={one.word} className="flex items-baseline gap-1.5">
              <dt className="text-muted-foreground">{one.word}</dt>
              <dd>{one.count}</dd>
            </span>
          ))}
      </dl>

      {session.transcript.length > 0 && (
        <div className="flex flex-col gap-2.5 pt-2">
          <span className="mb-1 text-xs tracking-[0.08em] text-muted-foreground">{t`What they said`}</span>
          {session.transcript.map((entry, index) =>
            entry.role === 'user' ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: a report only ever grows at the end, so an entry keeps the place it arrived in
              <div key={index} className="border-l border-border pl-3 text-muted-foreground">
                <Markdown text={entry.text} className="text-sm leading-relaxed" />
              </div>
            ) : (
              // biome-ignore lint/suspicious/noArrayIndexKey: a report only ever grows at the end, so an entry keeps the place it arrived in
              <Markdown key={index} text={entry.text} className="text-sm leading-relaxed" />
            ),
          )}
        </div>
      )}

      <CallStream calls={session.stream} />

      <HelperList helpers={helpers} />

      {session.agentId !== undefined && (
        <div data-worktree-review className="flex flex-col gap-2 pt-2">
          <span className="mb-1 text-xs tracking-[0.08em] text-muted-foreground">{t`What they changed`}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              disabled={review.busy}
              onClick={review.show}
              className="rounded-lg"
            >
              {t`Diff`}
            </Button>
            <Button
              variant="ghost"
              size="xs"
              disabled={review.busy}
              onClick={review.ask}
              className="rounded-lg text-muted-foreground"
            >
              {t`Roll back`}
            </Button>
          </div>
          {review.note.length > 0 && (
            <span className="text-xs text-muted-foreground">{review.note}</span>
          )}
          {review.rows !== null && review.rows.length > 0 && (
            <pre className="zt-scroll max-h-80 overflow-auto rounded-lg border border-border bg-card p-3 font-mono text-xs">
              {review.rows.map((row) => (
                <span key={row.key} className={cn('block', TONE[row.tone])}>
                  {row.text.length === 0 ? ' ' : row.text}
                </span>
              ))}
            </pre>
          )}
        </div>
      )}

      <AlertDialog open={review.confirming} onOpenChange={(open) => !open && review.cancel()}>
        <AlertDialogContent data-worktree-confirm>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {review.landed !== null && rollbackTitle(review.landed)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {review.landed !== null && rollbackWarning(review.landed)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t`Keep it`}</AlertDialogCancel>
            <AlertDialogAction onClick={review.rollback}>{t`Roll back`}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
