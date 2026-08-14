import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent, ReactNode } from 'react'
import { ArrowUp, Shield, Square, X } from 'lucide-react'
import { MODELS, PERMISSION_MODES } from '@/entities/agent-session'
import type {
  ModelChoice,
  PermissionAsk,
  PermissionMode,
  SessionStatus,
  StatusState,
} from '@/entities/agent-session'
import type { Turn } from '@/entities/conversation'
import { cn } from '@/shared/lib/cn'
import { modifierKey } from '@/shared/lib/platform/platform'
import { Button } from '@/shared/ui/button'
import { Kbd, KbdGroup } from '@/shared/ui/kbd'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/shared/ui/input-group'
import { Wordmark } from '@/shared/graphics/wordmark/wordmark'
import { StatusBar, StatusDrawer } from '@/widgets/status-bar'
import { beganComposing, endedComposing, newComposer, sent } from '../../lib/composer/composer'
import { Markdown } from '../Markdown'
import { Approval } from './Approval'
import { ChoicePicker } from './ChoicePicker'
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
  permissionMode: PermissionMode
  onPermissionMode(mode: PermissionMode): void
  model: ModelChoice
  onModel(model: ModelChoice): void
  sessionLive: boolean
  onSend(text: string): void
  onDecide(allow: boolean, always?: boolean): void
  onStop(): void
  onUpdateCli(): void
  updatingCli: boolean
  sidebar: ReactNode
  report: ReactNode
  addressee: string | null
  onClearAddressee(): void
}

export function ConversationPane({
  turns,
  status,
  statusState,
  permission,
  nowMs,
  permissionMode,
  onPermissionMode,
  model,
  onModel,
  sessionLive,
  onSend,
  onDecide,
  onStop,
  onUpdateCli,
  updatingCli,
  sidebar,
  report,
  addressee,
  onClearAddressee,
}: ConversationPaneProps) {
  const [draft, setDraft] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const draftRef = useRef<HTMLTextAreaElement>(null)
  const keying = useRef(newComposer())
  const busy = status === 'working'
  const lastIndex = turns.length - 1

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [turns, permission])

  function clearField(): void {
    setDraft('')
    const field = draftRef.current
    if (field !== null) field.value = ''
  }

  function submit(): void {
    const text = draft.trim()
    if (text.length === 0) return
    onSend(text)
    sent(keying.current)
    clearField()
    window.setTimeout(clearField, 0)
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault()
    submit()
  }

  function handleKey(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      submit()
    }
  }

  function composerNode() {
    return (
      <form onSubmit={handleSubmit} className="flex flex-none flex-col gap-2">
        {addressee !== null && (
          <div className="flex items-center gap-1.5 self-start rounded-full bg-card py-1 pr-1 pl-3 text-xs">
            <span>To {addressee}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onClearAddressee}
              aria-label="Clear"
              className="rounded-full text-muted-foreground"
            >
              <X />
            </Button>
          </div>
        )}
        <InputGroup className="rounded-3xl border-transparent bg-card p-1.5 shadow-none dark:bg-card">
          <InputGroupTextarea
            ref={draftRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onCompositionStart={() => beganComposing(keying.current)}
            onCompositionEnd={() => {
              if (endedComposing(keying.current)) window.setTimeout(clearField, 0)
            }}
            onKeyDown={handleKey}
            placeholder={
              addressee !== null
                ? `Task for ${addressee}`
                : turns.length === 0
                  ? 'What should they work on?'
                  : 'Keep going'
            }
            rows={1}
            className="max-h-40 min-h-11 py-2.5 text-base"
            autoFocus
          />
          <InputGroupAddon align="block-end" className="gap-1.5 px-1.5 pb-1.5">
            <ChoicePicker
              icon={<Shield />}
              options={PERMISSION_MODES}
              selected={permissionMode}
              onSelect={(id) => onPermissionMode(id as PermissionMode)}
              label="Permissions"
            />
            <ChoicePicker
              options={MODELS}
              selected={model}
              onSelect={(id) => onModel(id as ModelChoice)}
              label="Model"
              note={sessionLive ? 'Running session keeps its model — applies from the next one' : null}
            />
            <div className="ml-auto flex items-center gap-2">
              <KbdGroup>
                <Kbd>{modifierKey()}</Kbd>
                <Kbd>Enter</Kbd>
              </KbdGroup>
              {busy ? (
                <InputGroupButton
                  size="icon-sm"
                  variant="default"
                  onClick={onStop}
                  aria-label="Stop"
                  className="rounded-full"
                >
                  <Square />
                </InputGroupButton>
              ) : (
                <InputGroupButton
                  type="submit"
                  size="icon-sm"
                  variant="default"
                  disabled={draft.trim().length === 0}
                  aria-label="Send"
                  className="rounded-full"
                >
                  <ArrowUp />
                </InputGroupButton>
              )}
            </div>
          </InputGroupAddon>
        </InputGroup>
      </form>
    )
  }

  const composer = composerNode()

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
          <div className="mt-9 w-full max-w-3xl">{composerNode()}</div>
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
              ref={scrollRef}
              data-selectable
              className="zt-scroll flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-2"
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

