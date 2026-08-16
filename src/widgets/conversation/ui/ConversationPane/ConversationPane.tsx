import { useEffect, useRef } from 'react'
import { FileText, Image } from 'lucide-react'
import type { ReactNode } from 'react'
import type { PermissionAsk, SessionStatus, StatusState } from '@/entities/agent-session'
import type { Chore } from '@/entities/conversation'
import type { FaceId } from '@/entities/user'
import { personaOf } from '@/entities/agent-session'
import { AgentSprite } from '@/entities/agent-session/ui/AgentSprite/AgentSprite'
import type { Turn } from '@/entities/conversation'
import { cn } from '@/shared/lib/cn'
import { useScrollState } from '@/shared/lib/scroll-state/use-scroll-state'
import { shouldFollow } from '../../lib/follow/follow'
import { askedAtMs } from '../../lib/working/working'
import { Wordmark } from '@/shared/graphics/wordmark/wordmark'
import { Markdown } from '@/shared/markdown/Markdown/Markdown'
import { Approval } from './Approval'
import { Greeting } from './Greeting'
import { Thinking } from './Thinking'
import { ToolRun } from '../ToolRun/ToolRun'
import { Working } from './Working'
import { Away } from './Away'
import { Chores } from './Chores'
import type { Away as Waiting } from '../../lib/away/away.types'

const BUBBLE = 'rounded-2xl rounded-br-md bg-muted px-4 py-2.5'

type ConversationPaneProps = {
  turns: Turn[]
  status: SessionStatus
  statusState: StatusState
  permission: PermissionAsk | null
  you: { name: string; face: FaceId }
  away: Waiting | null
  chores: Chore[]
  nowMs: number
  onDecide(allow: boolean, always?: boolean): void
  sidebar: ReactNode
  report: ReactNode
  composer: ReactNode
}

export function ConversationPane({
  turns,
  status,
  statusState,
  permission,
  you,
  away,
  chores,
  nowMs,
  onDecide,
  sidebar,
  report,
  composer,
}: ConversationPaneProps) {
  const [attachScroll, scrollRef] = useScrollState<HTMLDivElement>()
  const seen = useRef(0)
  const busy = status === 'working'
  const lastIndex = turns.length - 1

  useEffect(() => {
    const el = scrollRef.current
    const before = seen.current
    seen.current = turns.length
    if (el === null) return
    if (!shouldFollow(before, turns.length, el.hasAttribute('data-at-end'))) return
    el.scrollTop = el.scrollHeight
  }, [turns, permission])


  if (turns.length === 0 && !permission) {
    return (
      <div className="relative z-[3] flex h-full gap-7">
        {sidebar}
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center">
          <Wordmark width={196} />
          <Greeting name={you.name} />
          <div className="mt-9 w-full max-w-3xl">{composer}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-[3] flex h-full gap-7">
      {sidebar}
      <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-1 flex-col gap-4 px-2">
        {report !== null ? (
          report
        ) : (
          <>
            <div
              ref={attachScroll}
              data-selectable
              className="zt-scroll zt-fade-out -mr-2 flex min-h-0 flex-1 flex-col gap-6 overflow-x-hidden overflow-y-auto pr-5 pb-3"
            >
              {turns.map((turn, index) => {
                const live = busy && index === lastIndex && turn.role === 'assistant'
                if (turn.role === 'system') {
                  return (
                    <div
                      key={index}
                      className="zt-rise self-center font-mono text-xs leading-normal tracking-wide text-muted-foreground [overflow-wrap:anywhere]"
                    >
                      {turn.text}
                    </div>
                  )
                }
                if (turn.role === 'user') {
                  return (
                    <div key={index} className="zt-rise flex max-w-[80%] flex-col items-end gap-1 self-end">
                      {turn.to !== undefined && (
                        <span
                          data-said-to
                          className="flex items-center gap-1.5 pr-1 text-xs text-muted-foreground"
                        >
                          <span aria-hidden>→</span>
                          <AgentSprite subagentType={turn.to} size={14} />
                          {personaOf(turn.to).name}
                        </span>
                      )}
                      {(turn.files ?? []).length > 0 && (
                        <span data-sent-files className="flex flex-wrap justify-end gap-1.5">
                          {(turn.files ?? []).map((file) => (
                            <span
                              key={file.path}
                              data-file={file.kind}
                              className="flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground"
                            >
                              {file.kind === 'image' ? (
                                <Image className="size-3.5" />
                              ) : (
                                <FileText className="size-3.5" />
                              )}
                              <span className="max-w-[180px] truncate">{file.name}</span>
                            </span>
                          ))}
                        </span>
                      )}
                      {turn.text.length > 0 && (
                        <div
                          className={cn(
                            BUBBLE,
                            'text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]',
                          )}
                        >
                          {turn.text}
                        </div>
                      )}
                    </div>
                  )
                }
                return (
                  <article
                    key={index}
                    className={cn('zt-rail zt-rise flex flex-col gap-2.5', live && 'zt-rail--live')}
                  >
                    {turn.thinking.length > 0 && <Thinking text={turn.thinking} />}
                    {turn.text.length > 0 && (
                      <Markdown text={turn.text} className="text-base leading-[1.72]" />
                    )}
                    {turn.draft.length > 0 && (
                      <div className="text-base leading-[1.72] whitespace-pre-wrap [overflow-wrap:anywhere]">
                        {turn.draft}
                        <span className="ml-0.5 inline-block h-[1em] w-[0.5ch] translate-y-[0.1em] bg-muted-foreground align-baseline" />
                      </div>
                    )}
                    {turn.tools.length > 0 && (
                      <ToolRun tools={turn.tools} live={live} nowMs={nowMs} />
                    )}
                  </article>
                )
              })}
            </div>
            <Chores chores={chores} nowMs={nowMs} />
            {!busy && away !== null && <Away away={away} face={you.face} nowMs={nowMs} />}
            {busy && (
              <Working
                turns={turns}
                face={you.face}
                nowMs={nowMs}
                startedAtMs={askedAtMs(turns, nowMs)}
                tokensOut={statusState.cost.tokens.out}
              />
            )}
          </>
        )}

        {permission ? <Approval ask={permission} onDecide={onDecide} /> : composer}
      </div>
    </div>
  )
}

