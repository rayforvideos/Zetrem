import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { Check, ChevronDown, Square } from 'lucide-react'
import { MODELS, PERMISSION_MODES } from '@/entities/agent-session'
import type {
  ModelChoice,
  PermissionAsk,
  PermissionMode,
  SessionStatus,
  StatusState,
} from '@/entities/agent-session'
import type { Turn, ToolActivity } from '@/pages/workspace/model/conversation'
import { cn } from '@/shared/lib/cn'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Textarea } from '@/shared/ui/textarea'
import { WORDMARK_SIGNATURE_OPACITY, WORDMARK_SIZE, Wordmark } from '@/shared/ui/wordmark'
import { StatusBar, StatusDrawer } from '@/widgets/status-bar'
import { TOOL_OUTPUT_LINES, moreLine } from '../lib/limits'
import { ToolDetail } from './ToolDetail'

type ConversationPaneProps = {
  turns: Turn[]
  status: SessionStatus
  /** 지속하는 값들 — 상태줄이 그린다. TUI 를 안 보여주는 대신 여기서 대신 말한다 */
  statusState: StatusState
  permission: PermissionAsk | null
  /** 지금 시각. 도는 차례가 얼마나 지났는지 세는 데 쓴다 */
  nowMs: number
  permissionMode: PermissionMode
  model: ModelChoice
  /** 대화 중에 모델을 바꾼다. 도는 세션에는 못 걸고 다음 세션부터 적용된다 */
  onModel(model: ModelChoice): void
  /** 지금 프로세스가 살아 있는가 — 바꾼 모델이 언제 적용되는지 말해야 한다 */
  sessionLive: boolean
  onSend(text: string): void
  onDecide(allow: boolean, always?: boolean): void
  onStop(): void
  /** 서랍의 "지금 갱신" 버튼 — Task 8 이 실제 IO 를 채운다 */
  onUpdateCli(): void
  updatingCli: boolean
}

/**
 * 대화 판 — 이 앱이 Claude Code 에게 일을 맡기고 그 진행을 지켜보는 자리.
 *
 * 뼈대는 shadcn(Button·Card·DropdownMenu·Textarea·Badge)이고, 색은 유리 틴트가 준다:
 * global.css 의 `@theme` 이 GlassPane 이 심는 `--zt-*` 를 shadcn 토큰에 묶는다. 그래서
 * 컴포넌트를 그대로 쓰면서도 배경 사진을 따라 극성이 뒤집히고 4.5:1 보증이 따라온다.
 *
 * 그 위에 이 앱의 것을 얹는다: 세 목소리의 활자, 작업 레일, 물 문법의 전환.
 */
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
}: ConversationPaneProps) {
  const [draft, setDraft] = useState('')
  // 서랍의 열림 상태는 상태줄 손잡이가 쥔다 — 다음 태스크가 실제 서랍을 채운다
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

  /** ⌘↵ 로 보낸다 — 여러 줄을 쓰는 자리이므로 ↵ 는 줄바꿈이어야 한다 */
  function handleKey(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      submit()
    }
  }

  const header = (
    <header className="flex flex-none items-center gap-2">
      <span className={statusDot(status)} />
      <span className="mr-auto text-[12.5px] font-semibold tracking-tight">Zeta</span>

      {/* 권한 모드는 세션의 성격이라 여기서는 사실만 말한다 — 바꾸려면 설정으로 간다 */}
      <Badge variant="outline" className="font-normal" title={modeHint(permissionMode)}>
        {modeLabel(permissionMode)}
      </Badge>

      {/* 모델은 대화 중에 가장 자주 바꾸는 것이다 — 여기서 바로 바꾼다 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-6 rounded-full px-2.5 text-[11px]">
            {modelLabel(model)}
            <ChevronDown className="size-3 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {MODELS.map((choice) => (
            <DropdownMenuItem
              key={choice.id}
              onSelect={() => onModel(choice.id)}
              className="items-start gap-2"
            >
              <Check className={cn('mt-0.5 size-3.5', choice.id === model ? '' : 'opacity-0')} />
              <span>
                <span className="block text-[12.5px] font-semibold">{choice.label}</span>
                <span className="text-muted-foreground block text-[11px] leading-snug">
                  {choice.hint}
                </span>
              </span>
            </DropdownMenuItem>
          ))}
          {sessionLive && (
            <DropdownMenuLabel className="text-muted-foreground font-mono text-[10.5px] font-normal">
              도는 세션은 그대로 — 다음 세션부터
            </DropdownMenuLabel>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )

  const composer = (
    <form onSubmit={handleSubmit} className="flex flex-none flex-col gap-2">
      <Textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKey}
        placeholder={turns.length === 0 ? '무엇을 맡길까요' : '이어서 말하기'}
        rows={turns.length === 0 ? 2 : 1}
        className="max-h-40 min-h-11 resize-none bg-transparent text-[13.5px]"
        autoFocus
      />
      <div className="flex items-center justify-between gap-2.5">
        <span className="text-muted-foreground font-mono text-[10.5px] tracking-wider">
          ⌘↵ 로 보내기
        </span>
        {busy ? (
          <Button type="button" variant="outline" size="sm" onClick={onStop}>
            <Square className="size-3" />
            멈추기
          </Button>
        ) : (
          <Button type="submit" size="sm">
            보내기
          </Button>
        )}
      </div>
    </form>
  )

  // 손잡이는 늘 같은 자리 — 서랍은 상태줄 위에서 그 자리를 차지할 뿐, 상태줄을 밀어 올리지 않는다
  // (물 문법: 서랍이 열려도 마지막 줄은 늘 상태줄이라 손잡이가 움직이지 않는다)
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

  // 시작하는 순간은 한 덩어리다 — 초대하는 문장 바로 아래에 쓰는 자리가 있어야 한다
  if (turns.length === 0 && !permission) {
    return (
      <div className="relative z-[3] flex h-full flex-col gap-3.5">
        {header}
        <div className="flex max-w-[560px] flex-1 flex-col justify-center gap-5">
          <div className="flex flex-col gap-2.5">
            {/* 표제가 이미 목소리를 가진 화면이라 서명은 작고 조용하게만 — 표제와 겨루면 주인이 둘이 된다 */}
            <Wordmark width={WORDMARK_SIZE.signature} className={WORDMARK_SIGNATURE_OPACITY} />
            <h1 className="font-serif text-[30px] leading-tight font-medium tracking-tight">
              무엇을 맡길까요
            </h1>
            <p className="max-w-[420px] text-[13.5px] leading-relaxed">
              일을 맡기면 여기 진행이 흐릅니다. 에이전트가 다른 에이전트를 부르면 그 일도 옆에
              판으로 섭니다.
            </p>
          </div>
          {composer}
        </div>
        {statusBar}
      </div>
    )
  }

  return (
    <div className="relative z-[3] flex h-full flex-col gap-3.5">
      {header}

      <div
        ref={scrollRef}
        className="zt-scroll flex min-h-0 flex-1 flex-col gap-[22px] overflow-y-auto pr-2"
      >
        {turns.map((turn, index) => {
          const live = busy && index === lastIndex && turn.role === 'assistant'
          if (turn.role === 'system') {
            // 기계가 알려주는 일 — 고정폭 11px, 레일 없이 조용히 한 줄
            return (
              <div
                key={index}
                className="zt-enter font-mono text-[11px] leading-normal tracking-wide opacity-60 [overflow-wrap:anywhere]"
              >
                {turn.text}
              </div>
            )
          }
          if (turn.role === 'user') {
            return (
              <div
                key={index}
                className="zt-enter text-[13px] leading-normal whitespace-pre-wrap opacity-75 [overflow-wrap:anywhere]"
              >
                {turn.text}
              </div>
            )
          }
          return (
            <article
              key={index}
              className={cn('zt-enter zt-rail flex flex-col gap-2.5', live && 'zt-rail--live')}
              style={{ ['--zt-rail-length' as string]: `${railLength(turn)}px` }}
            >
              {turn.thinking.length > 0 && <Thinking text={turn.thinking} />}
              {turn.text.length > 0 && (
                <div className="font-serif text-[15.5px] leading-[1.68] whitespace-pre-wrap [overflow-wrap:anywhere]">
                  {turn.text}
                </div>
              )}
              {turn.draft.length > 0 && (
                <div className="font-serif text-[15.5px] leading-[1.68] whitespace-pre-wrap [overflow-wrap:anywhere]">
                  {turn.draft}
                  {/* 흐르는 중임을 말하는 커서 한 칸 — 스피너와 달리 글자와 같은 줄에 선다 */}
                  <span className="ml-0.5 inline-block h-[1em] w-[0.5ch] translate-y-[0.1em] bg-current align-baseline opacity-70 animate-[tile-pulse_1.2s_ease-in-out_infinite]" />
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
                <div className="font-mono text-[10.5px] tracking-wider tabular-nums opacity-60">
                  {elapsed(nowMs - turn.startedAtMs)}
                </div>
              )}
            </article>
          )
        })}
      </div>

      {permission ? (
        <Card className="zt-enter flex-none gap-2 p-3">
          <div className="text-[13px] font-semibold">{permission.toolName} 실행을 허용할까요?</div>
          {/* 판단 근거는 요약하지 않는다 — 무엇이 실행되는지 그대로 보여야 승인이 승인이다 */}
          <code className="font-mono text-[12px] [overflow-wrap:anywhere]">{permission.line}</code>
          <div className="mt-0.5 flex gap-2">
            <Button size="sm" onClick={() => onDecide(true)}>
              허용
            </Button>
            <Button size="sm" variant="outline" onClick={() => onDecide(true, true)}>
              이 세션에선 항상
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDecide(false)}>
              거부
            </Button>
          </div>
        </Card>
      ) : (
        composer
      )}

      {statusBar}
    </div>
  )
}

/** 생각 — 본문과 같은 세리프에 기울기로 갈라진다. 기본은 접힘 (결론이 먼저다) */
function Thinking({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const paragraphs = text.split('\n\n').length
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        className="self-start font-mono text-[10.5px] tracking-wide opacity-60"
      >
        생각 {paragraphs}문단 {open ? '▴' : '▾'}
      </button>
      {open && (
        <div className="font-serif text-[13px] leading-[1.6] italic whitespace-pre-wrap opacity-80 [overflow-wrap:anywhere]">
          {text}
        </div>
      )}
    </div>
  )
}

/**
 * 눈금이 펼쳐져 있는가.
 *
 * 사람이 누른 것(override)과 기본값을 갈라 둔다. 산 흐름에서 눈금은 `tool_use` 줄에서
 * 서고 결과는 **그 뒤 줄**로 오는데, `useState(실패인가)` 는 초기값을 마운트 때 한 번만
 * 읽는다 — key 가 고정이라 다시 마운트되지도 않아, 나중에 붙은 실패는 영영 접힌 채였다.
 * 상태를 prop 에 맞춰 동기화하는 대신 "아직 손대지 않음(null)" 을 상태로 들고,
 * 그때는 매 렌더의 도구 값에서 기본값을 다시 뽑는다.
 */
export function tickOpen(override: boolean | null, tool: ToolActivity): boolean {
  // 실패는 이유가 화면에 있어야 한다 (스펙 §5.2) — 사람이 접은 적이 없을 때만 걸린다
  return override ?? tool.result?.isError === true
}

/** 눈금 하나 — 누르면 그 도구가 낸 출력이 아래로 열린다. 실패는 기본 펼침 */
function Tick({ tool, live }: { tool: ToolActivity; live: boolean }) {
  const [override, setOverride] = useState<boolean | null>(null)
  const open = tickOpen(override, tool)
  const output = [tool.result?.stdout, tool.result?.stderr].filter(Boolean).join('\n')
  const lines = output.split('\n')
  const shown = lines.slice(0, TOOL_OUTPUT_LINES).join('\n')
  const rest = lines.length - TOOL_OUTPUT_LINES
  // 판정과 렌더를 같은 호출 하나로 묶는다 — 별도의 판별 함수를 두면 그 함수의
  // 빈 값 조건이 이 렌더와 따로 진화해 언젠가 어긋난다. ToolDetail 은 훅을 쓰지
  // 않으니 컴포넌트가 아니라 평범한 함수로 불러 결과를 그대로 재사용한다.
  //
  // 기억해 두는 이유는 시계다: nowMs 가 1초마다 뛰어 판 전체가 다시 그려지는데,
  // 그때마다 접혀 있는 눈금까지 diff 를 다시 계산했다. 재료는 도구의 입력과 이름
  // (line 의 첫 낱말)뿐이라 둘이 그대로면 결과도 그대로다
  const detail = useMemo(() => ToolDetail({ tool }), [tool.input, tool.line])
  // 전용 렌더가 있는 도구는 결과가 아직 없어도 눈금을 눌러 볼 수 있어야 한다 —
  // 무엇을 하려는지가 결과보다 먼저다
  const expandable = tool.result !== null || detail !== null

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOverride(!open)}
        disabled={!expandable}
        aria-expanded={open}
        className={cn(
          'zt-tick truncate text-left font-mono text-[11px] leading-normal opacity-70',
          live && 'zt-tick--live',
        )}
      >
        {tool.line}
        {tool.result?.isError ? ' — 실패' : ''}
        {tool.result?.interrupted ? ' — 중단됨' : ''}
      </button>
      {open && (
        <div className="flex flex-col gap-1">
          {detail}
          {output.length > 0 && (
            <pre className="zt-scroll max-h-56 overflow-auto border-l border-current/20 pl-2 font-mono text-[10.5px] leading-normal whitespace-pre-wrap opacity-70">
              {shown}
              {rest > 0 ? `\n${moreLine(rest)}` : ''}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

/** 레일에 흐르는 빛이 지나갈 길이 — 차례의 길이에 맞춘다 */
function railLength(turn: Turn): number {
  // 초안도 글이다 — 흐르는 동안 레일이 멈춰 있으면 빛이 글을 못 따라간다
  const lines = (turn.text.length + turn.draft.length) / 44 + turn.tools.length
  return Math.max(60, Math.min(260, Math.round(lines * 22)))
}

/** 1분이 넘으면 분으로 — 초 단위 숫자가 세 자리가 되면 읽는 것이 아니라 보는 것이 된다 */
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

/** 작업 중은 맥동하는 점, 대기는 빈 고리, 끝난 것은 잔잔한 점 — 색은 들이지 않는다 */
function statusDot(status: SessionStatus): string {
  const base = 'size-1.5 flex-none rounded-full'
  if (status === 'working') return cn(base, 'bg-current animate-[tile-pulse_2.4s_ease-in-out_infinite]')
  if (status === 'waiting') return cn(base, 'border-[1.5px] border-current')
  return cn(base, 'bg-current opacity-35')
}
