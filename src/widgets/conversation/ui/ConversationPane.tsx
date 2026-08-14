import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent, ReactNode } from 'react'
import { Check, ChevronDown, Square } from 'lucide-react'
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
import { toolShape } from '@/shared/lib/tool-shape'
import { ToolIcon } from '@/shared/ui/tool-icon'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Textarea } from '@/shared/ui/textarea'
import { WORDMARK_SIGNATURE_OPACITY, WORDMARK_SIZE, Wordmark } from '@/shared/ui/wordmark'
import { WorkMap } from '@/widgets/work-map'
import { StatusBar, StatusDrawer } from '@/widgets/status-bar'
import { TOOL_OUTPUT_LINES, moreLine } from '../lib/limits'
import { Markdown } from './Markdown'
import { ToolDetail } from './ToolDetail'
import { ToolLine } from './ToolLine'

const BODY = 'text-[16px] leading-[1.72] tracking-[-0.011em]'

type ConversationPaneProps = {
  turns: Turn[]
  status: SessionStatus
  statusState: StatusState
  permission: PermissionAsk | null
  nowMs: number
  permissionMode: PermissionMode
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
  model,
  onModel,
  sessionLive,
  onSend,
  onDecide,
  onStop,
  onUpdateCli,
  updatingCli,
  roster,
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

  function composerNode(centered: boolean) {
    return (
      <form onSubmit={handleSubmit} className="flex flex-none flex-col">
        {addressee !== null && (
          <div className="mb-1 flex items-center gap-2 text-[11px]">
            <span className="opacity-70">{addressee} 에게</span>
            <Button
              variant="quiet"
              size="bare"
              onClick={onClearAddressee}
              aria-label="지목 지우기"
              className="font-mono text-[10.5px]"
            >
              ×
            </Button>
          </div>
        )}
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKey}
          placeholder={
            addressee !== null
              ? `${addressee} 에게 맡길 일`
              : turns.length === 0
                ? '무엇을 맡길까요'
                : '이어서 말하기'
          }
          rows={1}
          className={cn(
            'max-h-40 min-h-9 resize-none rounded-none border-0 bg-transparent px-0 py-1 text-[16px] leading-relaxed shadow-none placeholder:opacity-30 focus-visible:ring-0 dark:bg-transparent',
            centered && 'text-center',
          )}
          autoFocus
        />
        <div
          className={cn(
            'h-px w-full bg-current transition-opacity',
            draft.length > 0 ? 'opacity-30' : 'opacity-15',
          )}
        />
        {(busy || !centered) && (
          <div
            className={cn(
              'mt-2 flex items-center gap-3 text-[10.5px]',
              centered && 'justify-center',
            )}
          >
            {busy ? (
              <Button variant="quiet" size="bare" onClick={onStop} className="opacity-70">
                멈추기
              </Button>
            ) : (
              <span className="font-mono text-[11px] tracking-wider opacity-45">⌘↵</span>
            )}
          </div>
        )}
      </form>
    )
  }

  const composer = composerNode(false)

  const statusBar = (
    <>
      {drawerOpen && (
        <StatusDrawer statusState={statusState} onUpdate={onUpdateCli} updating={updatingCli} />
      )}
      <StatusBar
        status={statusState}
        open={drawerOpen}
        onToggle={() => setDrawerOpen((was) => !was)}
        permissionMode={permissionMode}
        model={model}
        onModel={onModel}
        sessionLive={sessionLive}
      />
    </>
  )

  if (turns.length === 0 && !permission) {
    return (
      <div className="relative z-[3] flex h-full gap-7">
        {sidebar}
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center">
          <Wordmark width={196} />
          <p className="mt-7 text-center text-[15px] leading-relaxed opacity-45">
            일을 맡기면 데려온 에이전트들이
            <br />
            나눠 맡습니다
          </p>
          <div className="mt-9 w-full max-w-[420px]">{composerNode(true)}</div>
          <div className="mt-4">
            <StatusBar
              status={statusState}
              open={drawerOpen}
              onToggle={() => setDrawerOpen((was) => !was)}
              permissionMode={permissionMode}
              model={model}
              onModel={onModel}
              sessionLive={sessionLive}
              variant="quiet"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-[3] flex h-full gap-7">
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
      {report !== null ? (
        report
      ) : (
        <>
      <WorkMap sessions={fleet} nowMs={nowMs} />

      <div
        ref={scrollRef}
        className="zt-scroll flex min-h-0 flex-1 flex-col gap-[22px] overflow-y-auto pr-2"
      >
        {turns.map((turn, index) => {
          const live = busy && index === lastIndex && turn.role === 'assistant'
          if (turn.role === 'system') {
            return (
              <div
                key={index}
                className="font-mono text-[11px] leading-normal tracking-wide opacity-70 [overflow-wrap:anywhere]"
              >
                {turn.text}
              </div>
            )
          }
          if (turn.role === 'user') {
            return (
              <div
                key={index}
                className="border-l border-current/25 pl-3 text-[14px] leading-relaxed whitespace-pre-wrap opacity-70 [overflow-wrap:anywhere]"
              >
                {turn.text}
              </div>
            )
          }
          return (
            <article
              key={index}
              className={cn('zt-rail flex flex-col gap-2.5', live && 'zt-rail--live')}
              style={{ ['--zt-rail-length' as string]: `${railLength(turn)}px` }}
            >
              {turn.thinking.length > 0 && <Thinking text={turn.thinking} />}
              {turn.text.length > 0 && <Markdown text={turn.text} className={BODY} />}
              {turn.draft.length > 0 && (
                <div className={cn(BODY, 'whitespace-pre-wrap [overflow-wrap:anywhere]')}>
                  {turn.draft}
                  <span className="ml-0.5 inline-block h-[1em] w-[0.5ch] translate-y-[0.1em] bg-current align-baseline opacity-70" />
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
                <div className="font-mono text-[10.5px] tracking-wider tabular-nums opacity-70">
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

// 결재는 이 앱에서 가장 중요한 순간이다 (docs/direction.md). 다른 무엇보다 밝게 서고,
// 누가 무엇을 하려는지 한 줄로 말하고, 손이 키보드를 떠나지 않고 끝난다.
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
    <div data-approval className="flex flex-none flex-col gap-3 border-t border-current/25 pt-4">
      <div className="flex items-baseline gap-2">
        <span className="text-[15px]">{verbOf(ask.toolName)}</span>
        <span className="font-mono text-[11px] opacity-45">{ask.toolName}</span>
      </div>

      <div className="flex items-start gap-2 font-mono text-[12.5px] [overflow-wrap:anywhere]">
        <span className="mt-[3px] flex-none">
          <ToolIcon shape={shape} />
        </span>
        <span>{ask.line}</span>
      </div>

      <div className="flex items-center gap-5 text-[12.5px]">
        <Button variant="quiet" size="bare" onClick={() => onDecide(true)} className="opacity-100">
          허용
          <span className="ml-1.5 font-mono text-[10.5px] opacity-45">⌘ Enter</span>
        </Button>
        <Button variant="quiet" size="bare" onClick={() => onDecide(false)}>
          거부
          <span className="ml-1.5 font-mono text-[10.5px] opacity-45">Esc</span>
        </Button>
        <Button variant="quiet" size="bare" onClick={() => onDecide(true, true)}>
          이 세션에선 묻지 않기
        </Button>
      </div>
    </div>
  )
}

function verbOf(toolName: string): string {
  if (toolName === 'Bash') return '명령을 돌려도 될까요'
  if (toolName === 'Write') return '파일을 새로 써도 될까요'
  if (toolName === 'Edit' || toolName === 'MultiEdit') return '파일을 고쳐도 될까요'
  if (toolName === 'WebFetch' || toolName === 'WebSearch') return '바깥에 나가도 될까요'
  return '해도 될까요'
}

function Thinking({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const paragraphs = text.split('\n\n').length
  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="quiet"
        size="bare"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        className="self-start font-mono text-[10.5px] tracking-wide opacity-70"
      >
        생각 {paragraphs}문단 {open ? '▴' : '▾'}
      </Button>
      {open && (
        <Markdown text={text} className="text-[12.5px] leading-[1.6] italic opacity-70" />
      )}
    </div>
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
          'zt-tick w-full min-w-0 justify-start text-left font-mono text-[11px] leading-normal opacity-70 disabled:opacity-70',
          live && 'zt-tick--live',
        )}
      >
        <ToolLine tool={tool} />
      </Button>
      {open && (
        <div className="flex flex-col gap-1">
          {detail}
          {output.length > 0 && (
            <pre className="zt-scroll max-h-56 overflow-auto border-l border-current/15 pl-2 font-mono text-[10.5px] leading-normal whitespace-pre-wrap opacity-70">
              {shown}
              {rest > 0 ? `\n${moreLine(rest)}` : ''}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

function railLength(turn: Turn): number {
  const lines = (turn.text.length + turn.draft.length) / 44 + turn.tools.length
  return Math.max(60, Math.min(260, Math.round(lines * 22)))
}

function elapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  if (seconds < 60) return `${seconds}초째`
  return `${Math.floor(seconds / 60)}분 ${seconds % 60}초째`
}

function modeLabel(mode: PermissionMode): string {
  return PERMISSION_MODES.find((item) => item.id === mode)?.label ?? '물어보기'
}

function modeHint(mode: PermissionMode): string {
  return PERMISSION_MODES.find((item) => item.id === mode)?.hint ?? ''
}

function modelLabel(model: ModelChoice): string {
  return MODELS.find((item) => item.id === model)?.label ?? '기본'
}

function statusDot(status: SessionStatus): string {
  const base = 'size-1.5 flex-none rounded-full'
  if (status === 'working') return cn(base, 'bg-current')
  if (status === 'waiting') return cn(base, 'border-[1.5px] border-current')
  return cn(base, 'bg-current opacity-30')
}
