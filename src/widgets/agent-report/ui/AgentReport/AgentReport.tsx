import type { AgentSession, SessionStatus } from '@/entities/agent-session'
import { useScrollState } from '@/shared/lib/scroll-state/use-scroll-state'
import { shapeOfLine, tally } from '@/shared/lib/tool-line/tool-line'
import { personaOf } from '@/entities/agent-session'
import { AgentSprite } from '@/entities/agent-session/ui/AgentSprite/AgentSprite'
import { Button } from '@/shared/ui/button'
import { ToolIcon } from '@/shared/graphics/tool-icon'
import { Markdown } from '@/shared/markdown/Markdown/Markdown'
import { leadOf } from '../../lib/lead/lead'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { leftBehind } from '../../lib/left-behind/left-behind'
import { runsOf, stepTo } from '../../lib/runs/runs'
import { i18n } from '@lingui/core'
import { msg, t } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'

const STATE: Record<SessionStatus, MessageDescriptor> = {
  working: msg`Working`,
  waiting: msg`Waiting on you`,
  reported: msg`Reported back`,
  done: msg`Done`,
}

type AgentReportProps = {
  session: AgentSession
  sessions: AgentSession[]
  nowMs: number
  onClose(): void
  onPick(id: string): void
}

export function AgentReport({ session, sessions, nowMs, onClose, onPick }: AgentReportProps) {
  const [body] = useScrollState<HTMLDivElement>()
  const runs = runsOf(sessions, session)
  const at = runs.findIndex((run) => run.id === session.id)
  const earlier = stepTo(runs, at, -1)
  const later = stepTo(runs, at, 1)
  const persona = personaOf(session.subagentType || session.label)
  const counted = tally(session.stream.map((call) => call.line))
  const ranMs = (session.endedAtMs ?? nowMs) - session.startedAtMs
  const lead = leadOf(session.headline, session.transcript)

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
              {i18n._(STATE[session.status])} · {Math.max(0, Math.round(ranMs / 1000))}s · {session.model}
            </span>
          </span>
        </div>
        <div className="flex flex-none items-center gap-3">
          {runs.length > 1 && (
            <span data-runs className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
              <Button
                variant="quiet"
                size="bare"
                disabled={earlier === null}
                onClick={() => earlier !== null && onPick(earlier)}
                aria-label={t`Earlier run`}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="tabular-nums">
                run {at + 1} of {runs.length}
              </span>
              <Button
                variant="quiet"
                size="bare"
                disabled={later === null}
                onClick={() => later !== null && onPick(later)}
                aria-label={t`Later run`}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </span>
          )}
          <Button variant="quiet" size="bare" onClick={onClose} aria-label={t`Close report`}>
            Close
          </Button>
        </div>
      </div>

      {lead !== null && <p className="text-sm leading-relaxed">{lead}</p>}

      <dl className="flex gap-6 font-mono text-xs tabular-nums">
        {[
          ['Read', counted.read],
          ['Edited', counted.wrote],
          ['Ran', counted.ran],
          ['Searched', counted.searched],
        ]
          .filter(([, count]) => (count as number) > 0)
          .map(([word, count]) => (
            <span key={word as string} className="flex items-baseline gap-1.5">
              <dt className="text-muted-foreground">{word}</dt>
              <dd>{count}</dd>
            </span>
          ))}
      </dl>

      {session.outcome && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {leftBehind(session.outcome)}
        </p>
      )}

      {session.transcript.length > 0 && (
        <div className="flex flex-col gap-2.5 pt-2">
          <span className="mb-1 text-xs tracking-[0.08em] text-muted-foreground">{t`What they said`}</span>
          {session.transcript.map((entry, index) =>
            entry.role === 'user' ? (
              <p
                key={index}
                className="border-l border-border pl-3 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground"
              >
                {entry.text}
              </p>
            ) : (
              <Markdown key={index} text={entry.text} className="text-sm leading-relaxed" />
            ),
          )}
        </div>
      )}

      <div className="flex flex-col gap-1 pt-2">
        <span className="mb-1 text-xs tracking-[0.08em] text-muted-foreground">{t`What they did`}</span>
        {session.stream.length === 0 && (
          <span className="text-xs text-muted-foreground">{t`Nothing yet`}</span>
        )}
        {session.stream.map((call) => {
          const shape = shapeOfLine(call.line)
          return (
            <span key={call.id} className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <ToolIcon shape={shape} />
              <span className="truncate">{call.line}</span>
              {call.failed ? (
                <span className="ml-auto flex-none text-removed">failed</span>
              ) : (
                call.note.length > 0 && <span className="ml-auto flex-none truncate">{call.note}</span>
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}
