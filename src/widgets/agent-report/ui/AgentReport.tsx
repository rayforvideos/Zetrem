import { personaOf } from '@/entities/agent-session'
import type { AgentSession } from '@/entities/agent-session'
import { shapeOfLine, tally } from '@/shared/lib/tool-line'
import { AgentFace } from '@/shared/ui/agent-face'
import { Button } from '@/shared/ui/button'
import { ToolIcon } from '@/shared/ui/tool-icon'

const STATE: Record<AgentSession['status'], string> = {
  working: '일하는 중',
  waiting: '내 결정을 기다리는 중',
  done: '보고를 마침',
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

  return (
    <div data-report className="zt-scroll flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <AgentFace persona={persona} size={22} />
          <span className="flex flex-col">
            <span className="text-[15px] leading-tight">{persona.name}</span>
            <span className="font-mono text-[10.5px] opacity-45">
              {STATE[session.status]} · {Math.max(0, Math.round(ranMs / 1000))}초 · {session.model}
            </span>
          </span>
        </div>
        <Button variant="quiet" size="bare" onClick={onClose} aria-label="보고서 닫기">
          닫기
        </Button>
      </div>

      {session.headline.length > 0 && <p className="text-[14px] leading-relaxed">{session.headline}</p>}

      <dl className="flex gap-6 font-mono text-[11px] tabular-nums">
        {[
          ['읽음', counted.read],
          ['고침', counted.wrote],
          ['돌림', counted.ran],
          ['찾음', counted.searched],
        ]
          .filter(([, count]) => (count as number) > 0)
          .map(([word, count]) => (
            <span key={word as string} className="flex items-baseline gap-1.5">
              <dt className="opacity-45">{word}</dt>
              <dd>{count}</dd>
            </span>
          ))}
      </dl>

      {session.outcome && (
        <p className="font-mono text-[11px] opacity-70">
          {session.outcome.branch} · 커밋 {session.outcome.commits} · 안 담긴 파일{' '}
          {session.outcome.dirtyFiles}
        </p>
      )}

      {session.transcript.length > 0 && (
        <div className="flex flex-col gap-2.5 border-t border-current/15 pt-4">
          {session.transcript.map((entry, index) => (
            <p
              key={index}
              className={
                entry.role === 'user'
                  ? 'border-l border-current/25 pl-3 text-[12.5px] leading-relaxed opacity-70'
                  : 'text-[14px] leading-relaxed'
              }
            >
              {entry.text}
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1 border-t border-current/15 pt-4">
        <span className="mb-1 text-[10.5px] tracking-[0.08em] opacity-45">한 일</span>
        {session.stream.length === 0 && (
          <span className="text-[11px] opacity-30">아직 아무것도 하지 않았습니다</span>
        )}
        {session.stream.map((line, index) => {
          const shape = shapeOfLine(line)
          return (
            <span key={`${index}-${line}`} className="flex items-center gap-2 font-mono text-[11px] opacity-70">
              <ToolIcon shape={shape} />
              <span className="truncate">{line}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
