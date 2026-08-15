import type { AgentSession } from '@/entities/agent-session'
import { shapeOfLine, tally } from '@/shared/lib/tool-line/tool-line'
import { personaOf } from '@/entities/agent-session'
import { AgentSprite } from '@/entities/agent-session/ui/AgentSprite/AgentSprite'
import { Button } from '@/shared/ui/button'
import { ToolIcon } from '@/shared/graphics/tool-icon'
import { WorkTrace } from '@/shared/graphics/WorkTrace/WorkTrace'
import { marksOf } from '@/entities/agent-session/lib/marks/marks'
import { leadOf } from '../../lib/lead/lead'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { leftBehind } from '../../lib/left-behind/left-behind'
import { runsOf, stepTo } from '../../lib/runs/runs'

const STATE: Record<AgentSession['status'], string> = {
  working: 'Working',
  waiting: 'Waiting on you',
  reported: 'Reported back',
  done: 'Done',
}

type AgentReportProps = {
  session: AgentSession
  sessions: AgentSession[]
  nowMs: number
  onClose(): void
  onPick(id: string): void
}

export function AgentReport({ session, sessions, nowMs, onClose, onPick }: AgentReportProps) {
  const runs = runsOf(sessions, session)
  const at = runs.findIndex((run) => run.id === session.id)
  const earlier = stepTo(runs, at, -1)
  const later = stepTo(runs, at, 1)
  const persona = personaOf(session.subagentType || session.label)
  const counted = tally(session.stream.map((call) => call.line))
  const ranMs = (session.endedAtMs ?? nowMs) - session.startedAtMs
  const lead = leadOf(session.headline, session.transcript)

  return (
    <div data-report data-selectable className="zt-scroll flex min-h-0 flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto">
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
              {STATE[session.status]} · {Math.max(0, Math.round(ranMs / 1000))}s · {session.model}
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
                aria-label="Earlier run"
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
                aria-label="Later run"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </span>
          )}
          <Button variant="quiet" size="bare" onClick={onClose} aria-label="Close report">
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
        <div className="flex flex-col gap-2.5 border-t border-border pt-4">
          {session.transcript.map((entry, index) => (
            <p
              key={index}
              className={
                entry.role === 'user'
                  ? 'border-l border-border pl-3 text-sm leading-relaxed text-muted-foreground'
                  : 'text-sm leading-relaxed'
              }
            >
              {entry.text}
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1 border-t border-border pt-4">
        <div className="mb-1 flex items-baseline justify-between gap-4">
          <span className="text-xs tracking-[0.08em] text-muted-foreground">What they did</span>
          <span className="min-w-0 flex-1 text-muted-foreground">
            <WorkTrace marks={marksOf(session.stream, nowMs, session.status === 'working')} />
          </span>
        </div>
        {session.stream.length === 0 && (
          <span className="text-xs text-muted-foreground">Nothing yet</span>
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
