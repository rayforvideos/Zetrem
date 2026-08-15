import type { AgentSession } from '@/entities/agent-session'
import { shapeOfLine, tally } from '@/shared/lib/tool-line/tool-line'
import { personaOf } from '@/entities/agent-session'
import { AgentSprite } from '@/entities/agent-session/ui/AgentSprite/AgentSprite'
import { Button } from '@/shared/ui/button'
import { ToolIcon } from '@/shared/graphics/tool-icon'
import { leadOf } from '../../lib/lead/lead'
import { leftBehind } from '../../lib/left-behind/left-behind'

const STATE: Record<AgentSession['status'], string> = {
  working: 'Working',
  waiting: 'Waiting on you',
  reported: 'Reported back',
  done: 'Done',
}

type AgentReportProps = {
  session: AgentSession
  nowMs: number
  onClose(): void
}

export function AgentReport({ session, nowMs, onClose }: AgentReportProps) {
  const persona = personaOf(session.subagentType || session.label)
  const counted = tally(session.stream)
  const ranMs = (session.endedAtMs ?? nowMs) - session.startedAtMs
  const lead = leadOf(session.headline, session.transcript)

  return (
    <div data-report data-selectable className="zt-scroll flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-2">
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
        <Button variant="quiet" size="bare" onClick={onClose} aria-label="Close report">
          Close
        </Button>
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
        <span className="mb-1 text-xs tracking-[0.08em] text-muted-foreground">What they did</span>
        {session.stream.length === 0 && (
          <span className="text-xs text-muted-foreground">Nothing yet</span>
        )}
        {session.stream.map((line, index) => {
          const shape = shapeOfLine(line)
          return (
            <span key={`${index}-${line}`} className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <ToolIcon shape={shape} />
              <span className="truncate">{line}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
