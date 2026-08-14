import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent, ReactNode } from 'react'
import { ArrowUp, ChevronDown, Shield, Square, X } from 'lucide-react'
import { MODELS, PERMISSION_MODES } from '@/entities/agent-session'
import type {
  ModelChoice,
  PermissionAsk,
  PermissionMode,
  SessionStatus,
  StatusState,
} from '@/entities/agent-session'
import type { AgentSession, RosterMember } from '@/entities/agent-session'
import type { Turn, ToolActivity } from '@/pages/workspace/model/conversation'
import { cn } from '@/shared/lib/cn'
import { modifierKey } from '@/shared/lib/platform'
import { toolShape } from '@/shared/lib/tool-shape'
import { ToolIcon } from '@/shared/ui/tool-icon'
import { Button } from '@/shared/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible'
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
import { Wordmark } from '@/shared/ui/wordmark'
import { WorkMap } from '@/widgets/work-map'
import { StatusBar, StatusDrawer } from '@/widgets/status-bar'
import { TOOL_OUTPUT_LINES, moreLine } from '../lib/limits'
import { Markdown } from './Markdown'
import { ToolDetail } from './ToolDetail'
import { ToolLine } from './ToolLine'

const BUBBLE = 'rounded-2xl bg-card px-4 py-3'

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
  roster: RosterMember[]
  fleet: AgentSession[]
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
  fleet,
  sidebar,
  report,
  addressee,
  onClearAddressee,
}: ConversationPaneProps) {
  const [draft, setDraft] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const busy = status === 'working'
  const lastIndex = turns.length - 1

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [turns, permission])

  function submit(): void {
    const text = draft.trim()
    if (text.length === 0) return
    onSend(text)
    setDraft('')
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
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
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
          <p className="mt-7 text-center text-base leading-relaxed break-keep text-muted-foreground">
            Let's get to work with your cute little agents!
          </p>
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
            <WorkMap sessions={fleet} nowMs={nowMs} />

            <div
              ref={scrollRef}
              data-selectable
              className="zt-scroll flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-2"
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
                      <div className="flex flex-col gap-1">
                        {turn.tools.map((tool, toolIndex) => (
                          <Tick
                            key={`${toolIndex}-${tool.toolUseId ?? tool.line}`}
                            tool={tool}
                            live={live && toolIndex === turn.tools.length - 1}
                          />
                        ))}
                      </div>
                    )}
                    {live && (
                      <div className="font-mono text-xs tracking-wider tabular-nums text-muted-foreground">
                        {elapsed(nowMs - turn.startedAtMs)}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </>
        )}

        {permission ? <Approval ask={permission} onDecide={onDecide} /> : composer}

        {statusBar}
      </div>
    </div>
  )
}

function Approval({
  ask,
  onDecide,
}: {
  ask: PermissionAsk
  onDecide(allow: boolean, always?: boolean): void
}) {
  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent): void {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        onDecide(true)
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        onDecide(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDecide])

  const shape = toolShape(ask.toolName, null)

  return (
    <div
      data-approval
      className="flex flex-none flex-col gap-3 rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-baseline gap-2">
        <span className="text-base">{verbOf(ask.toolName)}</span>
        <span className="font-mono text-xs text-muted-foreground">{ask.toolName}</span>
      </div>

      <div data-selectable className="flex items-start gap-2 font-mono text-sm [overflow-wrap:anywhere]">
        <span className="mt-[3px] flex-none text-muted-foreground">
          <ToolIcon shape={shape} />
        </span>
        <span>{ask.line}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => onDecide(true)} className="rounded-full">
          Allow
          <KbdGroup>
            <Kbd className="bg-primary-foreground/15 text-primary-foreground/70">
              {modifierKey()}
            </Kbd>
            <Kbd className="bg-primary-foreground/15 text-primary-foreground/70">Enter</Kbd>
          </KbdGroup>
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onDecide(false)}
          className="rounded-full"
        >
          Deny
          <Kbd>Esc</Kbd>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDecide(true, true)}
          className="rounded-full text-muted-foreground"
        >
          Don't ask again this session
        </Button>
      </div>
    </div>
  )
}

type Choice = { id: string; label: string; hint: string }

function ChoicePicker({
  icon,
  options,
  selected,
  onSelect,
  label,
  note = null,
}: {
  icon?: ReactNode
  options: Choice[]
  selected: string
  onSelect(id: string): void
  label: string
  note?: string | null
}) {
  const current = options.find((option) => option.id === selected)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <InputGroupButton
          size="xs"
          className="rounded-full text-muted-foreground hover:text-foreground"
          aria-label={label}
          title={current?.hint}
        >
          {icon}
          {current?.label ?? label}
          <ChevronDown />
        </InputGroupButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{label}</DropdownMenuLabel>
        <DropdownMenuGroup>
          {options.map((option) => (
            <DropdownMenuItem key={option.id} onSelect={() => onSelect(option.id)}>
              <span className={cn(option.id === selected ? '' : 'text-muted-foreground')}>
                <span className="block text-sm">{option.label}</span>
                <span className="block text-xs leading-snug text-muted-foreground">
                  {option.hint}
                </span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        {note !== null && (
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {note}
          </DropdownMenuLabel>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function verbOf(toolName: string): string {
  if (toolName === 'Bash') return 'Run this command?'
  if (toolName === 'Write') return 'Write this file?'
  if (toolName === 'Edit' || toolName === 'MultiEdit') return 'Edit this file?'
  if (toolName === 'WebFetch' || toolName === 'WebSearch') return 'Reach out to the web?'
  return 'Allow this?'
}

function Thinking({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const paragraphs = text.split('\n\n').length
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="flex flex-col gap-1">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          className="self-start rounded-full font-mono tracking-wide text-muted-foreground"
        >
          Thought · {paragraphs} paragraphs
          <ChevronDown data-icon="inline-end" className={cn(open && 'rotate-180')} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Markdown text={text} className="text-sm leading-[1.6] italic text-muted-foreground" />
      </CollapsibleContent>
    </Collapsible>
  )
}

export function tickOpen(override: boolean | null, tool: ToolActivity): boolean {
  return override ?? tool.result?.isError === true
}

function Tick({ tool, live }: { tool: ToolActivity; live: boolean }) {
  const [override, setOverride] = useState<boolean | null>(null)
  const open = tickOpen(override, tool)
  const output = [tool.result?.stdout, tool.result?.stderr].filter(Boolean).join('\n')
  const lines = output.split('\n')
  const shown = lines.slice(0, TOOL_OUTPUT_LINES).join('\n')
  const rest = lines.length - TOOL_OUTPUT_LINES
  const detail = useMemo(() => ToolDetail({ tool }), [tool.input, tool.line])
  const expandable = tool.result !== null || detail !== null

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="quiet"
        size="bare"
        onClick={() => setOverride(!open)}
        disabled={!expandable}
        aria-expanded={open}
        data-tick={tool.toolUseId ?? tool.line}
        className={cn(
          'zt-tick w-full min-w-0 justify-start text-left font-mono text-xs leading-normal text-muted-foreground disabled:opacity-100',
          live && 'zt-tick--live',
        )}
      >
        <ToolLine tool={tool} />
      </Button>
      {open && (
        <div className="flex flex-col gap-1">
          {detail}
          {output.length > 0 && (
            <pre className="zt-scroll max-h-56 overflow-auto rounded-lg bg-card p-2.5 font-mono text-xs leading-normal whitespace-pre-wrap text-muted-foreground">
              {shown}
              {rest > 0 ? `\n${moreLine(rest)}` : ''}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

function elapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}
