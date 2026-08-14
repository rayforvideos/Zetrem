import { useState } from 'react'
import { personaOf } from '@/entities/agent-session'
import type { AgentDefDraft } from '@/entities/agent-def'
import { cn } from '@/shared/lib/cn'
import { AgentFace } from '@/shared/ui/agent-face'
import { Button } from '@/shared/ui/button'
import type { Origin, TeamMember } from '../lib/team'

const ORIGIN: Record<Origin, string> = {
  project: '이 프로젝트',
  user: '내 계정',
  session: '엔진이 데려옴',
}

const STATE: Record<TeamMember['state'], string | null> = {
  waiting: '기다리는 중',
  working: null,
  done: '보고함',
  idle: null,
}

type TeamSidebarProps = {
  members: TeamMember[]
  sessionKnown: boolean
  canWrite: boolean
  note: string | null
  onHire(draft: AgentDefDraft): void
  onPick(sessionId: string): void
  onAddress(subagentType: string): void
}

export function TeamSidebar({
  members,
  sessionKnown,
  canWrite,
  note,
  onHire,
  onPick,
  onAddress,
}: TeamSidebarProps) {
  const [hiring, setHiring] = useState(false)

  return (
    <aside className="zt-scroll flex w-[212px] flex-none flex-col gap-4 overflow-y-auto border-r border-current/15 pr-5">
      <div className="flex items-baseline justify-between text-[10.5px] tracking-[0.08em] opacity-45">
        <span>데리고 있는 사람</span>
        <span className="font-mono tabular-nums">{members.length}</span>
      </div>

      {members.length === 0 && (
        <p className="text-[10.5px] leading-relaxed opacity-30">
          아직 아무도 없습니다. 아래에서 사람을 들이면 이 자리에 섭니다.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {members.map((member) => {
          const note = STATE[member.state] ?? member.note
          const body = (
            <>
              <AgentFace persona={personaOf(member.type)} size={18} />
              <span className="flex min-w-0 flex-col gap-0.5 text-left">
                <span className="flex items-baseline gap-1.5">
                  <span className="truncate text-[12.5px] leading-tight">{member.name}</span>
                  {member.model !== null && (
                    <span className="flex-none font-mono text-[10.5px] opacity-45">
                      {member.model}
                    </span>
                  )}
                </span>
                <span className="truncate text-[10.5px] leading-tight opacity-45">
                  {note ?? member.description ?? ''}
                </span>
              </span>
            </>
          )
          const mute = sessionKnown && !member.callable
          const dim =
            member.state === 'idle' ? (mute ? 'opacity-30' : 'opacity-70') : 'opacity-100'
          const why = !member.loaded
            ? `${ORIGIN[member.origin]} — 다음 세션부터 실립니다`
            : '이번 세션에서는 부를 수 없습니다 — 설정에서 잠금을 풀 수 있습니다'
          return (
            <Button
              key={member.type}
              variant="quiet"
              size="bare"
              onClick={() =>
                member.sessionId !== null ? onPick(member.sessionId) : onAddress(member.type)
              }
              disabled={mute}
              className={cn('min-w-0 justify-start gap-2 opacity-100', dim)}
              title={
                member.sessionId !== null ? '한 일을 봅니다' : mute ? why : '이 사람에게 맡깁니다'
              }
            >
              {body}
            </Button>
          )
        })}
      </div>

      <div className="mt-1 flex flex-col gap-3 border-t border-current/15 pt-3">
          {hiring ? (
            <HireForm
              onCancel={() => setHiring(false)}
              onSubmit={(draft) => {
                onHire(draft)
                setHiring(false)
              }}
            />
          ) : (
            <Button
              variant="quiet"
              size="bare"
              onClick={() => setHiring(true)}
              disabled={!canWrite}
              className="justify-start gap-1.5 text-[11px]"
              title={canWrite ? undefined : '프로젝트를 먼저 골라야 합니다'}
            >
              <span className="text-[12.5px] leading-none">+</span>
              사람 새로 들이기
            </Button>
          )}
          {note !== null && (
            <p data-note className="text-[10.5px] leading-snug opacity-45">
              {note}
            </p>
          )}
        </div>
    </aside>
  )
}

function HireForm({
  onSubmit,
  onCancel,
}: {
  onSubmit(draft: AgentDefDraft): void
  onCancel(): void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [prompt, setPrompt] = useState('')
  const [missing, setMissing] = useState<string | null>(null)
  const lack =
    name.trim().length === 0
      ? '이름이 있어야 합니다'
      : prompt.trim().length === 0
        ? '무슨 일을 어떻게 하는지 적어야 합니다'
        : null

  const field =
    'w-full resize-none border-0 border-b border-current/15 bg-transparent px-0 py-1 text-[11px] outline-none placeholder:opacity-30'

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (lack !== null) {
          setMissing(lack)
          return
        }
        onSubmit({
          name: name.trim(),
          description: description.trim(),
          model: null,
          tools: [],
          prompt: prompt.trim(),
        })
      }}
    >
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="이름"
        className={field}
      />
      <input
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="언제 부를 사람인가"
        className={field}
      />
      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="무슨 일을 어떻게 하는지"
        rows={4}
        className={field}
      />
      <div className="flex items-center gap-3 text-[11px]">
        <Button type="submit" variant="quiet" size="bare" className="opacity-70">
          들이기
        </Button>
        <Button variant="quiet" size="bare" onClick={onCancel}>
          그만두기
        </Button>
      </div>
      <p className="text-[10.5px] leading-snug opacity-30">
        {missing ?? '엔진은 다음 세션부터 이 사람을 압니다'}
      </p>
    </form>
  )
}
