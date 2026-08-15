import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { PermissionAsk, SessionStatus, StatusState } from '@/entities/agent-session'
import type { Turn } from '@/entities/conversation'
import { cn } from '@/shared/lib/cn'
import { useScrollState } from '@/shared/lib/scroll-state/use-scroll-state'
import { Wordmark } from '@/shared/graphics/wordmark/wordmark'
import { StatusBar, StatusDrawer } from '@/widgets/status-bar'
import { Markdown } from '../Markdown'
import { Approval } from './Approval'
import { Greeting } from './Greeting'
import { Thinking } from './Thinking'
import { Tick } from './Tick'
import { Working } from './Working'

const BUBBLE = 'rounded-2xl rounded-br-md bg-muted px-4 py-2.5'

type ConversationPaneProps = {
  turns: Turn[]
  status: SessionStatus
  statusState: StatusState
  permission: PermissionAsk | null
  nowMs: number
  onDecide(allow: boolean, always?: boolean): void
  onUpdateCli(): void
  updatingCli: boolean
  sidebar: ReactNode
  report: ReactNode
  composer: ReactNode
}

export function ConversationPane({
  turns,
  status,
  statusState,
  permission,
  nowMs,
  onDecide,
  onUpdateCli,
  updatingCli,
  sidebar,
  report,
  composer,
}: ConversationPaneProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [attachScroll, scrollRef] = useScrollState<HTMLDivElement>()
  const busy = status === 'working'
  const lastIndex = turns.length - 1

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [turns, permission])


  const statusBar = (
    <>
      {drawerOpen && (
        <StatusDrawer statusState={statusState} onUpdate={onUpdateCli} updating={updatingCli} />
      )}
      <StatusBar
        status={statusState}
        open={drawerOpen}
        onToggle={() => setDrawerOpen((was) => !was)}
      />
    </>
  )

  if (turns.length === 0 && !permission) {
    return (
      <div className="relative z-[3] flex h-full gap-7">
        {sidebar}
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center">
          <Wordmark width={196} />
          <Greeting />
          <div className="mt-9 w-full max-w-3xl">{composer}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-[3] flex h-full gap-7">
      {sidebar}
      <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-1 flex-col gap-4">
        {report !== null ? (
          report
        ) : (
          <>
            <div
              ref={attachScroll}
              data-selectable
              className="zt-scroll zt-fade-out flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-2"
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
                    <div
                      key={index}
                      className={cn(
                        BUBBLE,
                        'zt-rise max-w-[80%] self-end text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]',
                      )}
                    >
                      {turn.text}
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
                      <div className="-mx-1.5 flex flex-col gap-0.5">
                        {turn.tools.map((tool, toolIndex) => (
                          <Tick
                            key={`${toolIndex}-${tool.toolUseId ?? tool.line}`}
                            tool={tool}
                            live={live && toolIndex === turn.tools.length - 1}
                          />
                        ))}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
            {busy && (
              <Working
                turn={turns.at(-1)?.role === 'assistant' ? (turns.at(-1) ?? null) : null}
                nowMs={nowMs}
                startedAtMs={turns.at(-1)?.startedAtMs ?? nowMs}
                tokensOut={statusState.cost.tokens.out}
                agent={statusState.session?.model ?? 'orchestrator'}
              />
            )}
          </>
        )}

        {permission ? <Approval ask={permission} onDecide={onDecide} /> : composer}

        {statusBar}
      </div>
    </div>
  )
}

