import type { PermissionAsk, SessionStatus } from '@/entities/agent-session'

/**
 * 우리 UI 가 그리는 대화.
 *
 * Claude Code 의 TUI 는 화면에 없다 — 프로세스는 뒤에서 돌고, 사람이 보는 것은 이 상태를
 * 우리 문법으로 그린 것이다. 그래서 여기 담기는 것은 "터미널 출력" 이 아니라 **차례**다:
 * 누가 말했는가, 그 차례에 어떤 도구를 썼는가.
 */
export type ToolResult = {
  stdout: string
  stderr: string
  isError: boolean
  interrupted: boolean
}

/** 도구 한 번 — 눈금 하나. 결과는 나중에 도착해 여기에 붙는다 */
export type ToolActivity = {
  line: string
  toolUseId: string | null
  /** 도구 입력 원본 — 전용 렌더(diff·체크리스트)의 재료다. 모르는 모양이면 null */
  input: unknown
  result: ToolResult | null
}

export type Turn = {
  role: 'user' | 'assistant' | 'system'
  text: string
  /** 이 차례에 지나간 도구 활동. 말 아래 조용히 쌓인다 (스펙 §5.2) */
  tools: ToolActivity[]
  /**
   * 흐르는 초안 — 확정되지 않은 델타의 누적.
   * 확정본(say)이 오면 버려진다. 같은 내용을 두 번 그리지 않기 위해서다 (실측 2026-08-14)
   */
  draft: string
  /** 생각 — 본문과 같은 활자족이지만 결론이 아니다. 차례에 하나로 모인다 */
  thinking: string
  /** 이 차례가 열린 시각. 이 앱은 일이 흘러가는 것을 보는 앱이라 시간이 내용의 일부다 */
  startedAtMs: number
}

export type ConversationState = {
  turns: Turn[]
  status: SessionStatus
  permission: PermissionAsk | null
}

type Listener = () => void

const EMPTY: ConversationState = { turns: [], status: 'done', permission: null }

let state: ConversationState = EMPTY
const listeners = new Set<Listener>()

function emit(next: ConversationState): void {
  state = next
  for (const listener of listeners) listener()
}

/** 마지막 차례가 이 역할의 것이고 아직 도구를 쓰지 않았으면 거기에 이어 붙인다 */
function appendable(role: Turn['role']): Turn | null {
  // 사건은 각각 한 줄이다 — 합치면 시간 순서가 뭉개진다
  if (role === 'system') return null
  const last = state.turns.at(-1)
  if (!last || last.role !== role) return null
  return last.tools.length === 0 ? last : null
}

/**
 * 확정된 글 두 덩이를 잇는 규칙 — 한 벌만 둔다.
 *
 * 빈 글에 이을 때 빈 줄을 앞세우지 않는 것이 요점이다: 초안만 있던 차례가 확정될 때
 * 문단이 하나 밀려 보인다. `say` 와 `settleDraft` 가 같은 것을 써야 두 길로 들어온
 * 글이 같은 모양으로 선다.
 */
function joined(existing: string, added: string): string {
  return existing.length === 0 ? added : `${existing}\n\n${added}`
}

export const conversation = {
  get(): ConversationState {
    return state
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  say(role: Turn['role'], text: string): void {
    const target = appendable(role)
    if (target) {
      // 초안은 확정본이 오면 버려진다 — 이어붙이면 같은 문장이 두 번 뜬다 (실측)
      const merged = { ...target, draft: '', text: joined(target.text, text) }
      emit({ ...state, turns: [...state.turns.slice(0, -1), merged] })
      return
    }
    emit({
      ...state,
      turns: [
        ...state.turns,
        { role, text, tools: [], draft: '', thinking: '', startedAtMs: Date.now() },
      ],
    })
  },
  tool(line: string, toolUseId: string | null, input?: unknown): void {
    const last = state.turns.at(-1)
    const activity: ToolActivity = { line, toolUseId, input: input ?? null, result: null }
    // 말보다 도구가 먼저 오는 턴이 있다 — 그 활동이 사라지지 않게 차례를 연다
    if (!last || last.role !== 'assistant') {
      emit({
        ...state,
        turns: [
          ...state.turns,
          { role: 'assistant', text: '', tools: [activity], draft: '', thinking: '', startedAtMs: Date.now() },
        ],
      })
      return
    }
    const merged = { ...last, tools: [...last.tools, activity] }
    emit({ ...state, turns: [...state.turns.slice(0, -1), merged] })
  },
  /**
   * 도구가 낸 출력이 그 눈금에 붙는다. 어느 차례의 눈금인지는 id 가 안다.
   * 짝을 모르는 출력(자식 것이거나 이미 지나간 차례)은 세울 자리가 없어 버린다.
   */
  toolResult(toolUseId: string, result: ToolResult): void {
    const index = state.turns.findIndex((turn) =>
      turn.tools.some((tool) => tool.toolUseId === toolUseId),
    )
    if (index === -1) return
    const turn = state.turns[index]!
    const tools = turn.tools.map((tool) =>
      tool.toolUseId === toolUseId ? { ...tool, result } : tool,
    )
    const turns = [...state.turns]
    turns[index] = { ...turn, tools }
    emit({ ...state, turns })
  },
  /** 생각 — 본문과 같은 활자족이지만 결론이 아니다. 차례에 하나로 모인다 */
  think(text: string): void {
    const last = state.turns.at(-1)
    if (!last || last.role !== 'assistant' || last.tools.length > 0) {
      emit({
        ...state,
        turns: [
          ...state.turns,
          { role: 'assistant', text: '', tools: [], draft: '', thinking: text, startedAtMs: Date.now() },
        ],
      })
      return
    }
    const merged = { ...last, thinking: last.thinking ? `${last.thinking}\n\n${text}` : text }
    emit({ ...state, turns: [...state.turns.slice(0, -1), merged] })
  },
  /**
   * 일어난 일 한 줄 — 한도 경고, 압축, API 오류, 턴 결산.
   * 상태줄이 드는 "지금 값" 과 달리 이것은 시간 위의 점이라 대화에 남아야 한다.
   */
  system(text: string): void {
    emit({
      ...state,
      turns: [
        ...state.turns,
        { role: 'system', text, tools: [], draft: '', thinking: '', startedAtMs: Date.now() },
      ],
    })
  },
  /** 흐르는 초안. 확정된 말이 오면 say 가 이것을 비운다 */
  delta(text: string): void {
    const last = state.turns.at(-1)
    if (!last || last.role !== 'assistant' || last.tools.length > 0) {
      emit({
        ...state,
        turns: [
          ...state.turns,
          { role: 'assistant', text: '', tools: [], draft: text, thinking: '', startedAtMs: Date.now() },
        ],
      })
      return
    }
    const merged = { ...last, draft: last.draft + text }
    emit({ ...state, turns: [...state.turns.slice(0, -1), merged] })
  },
  /**
   * 흐르던 초안을 확정본으로 앉힌다 — 차례가 확정 메시지 없이 끝났을 때
   * (턴 끝·중단·프로세스 종료).
   *
   * 버리지 않는 이유: 그 글은 **이미 도착해서 사람이 눈으로 읽은 것**이다. 멈춤을
   * 누른 사람이 알고 싶은 것은 "어디까지 말했나" 이지 "아무 말도 없었다" 가 아니라,
   * 지우는 쪽이야말로 이 화면이 없애려는 그 거짓말이 된다. 남는 거짓말은 초안 옆의
   * 맥동하는 커서("지금 오고 있다")뿐인데, 그것은 draft 가 비면 저절로 멈춘다.
   *
   * 잇는 규칙은 `say` 와 같은 것(`joined`)을 쓴다 — 두 길로 들어온 글이 같은 모양으로
   * 서야 한다. 중복 걱정은 없다: 정상 턴은 확정본(`say`)이 이미 초안을 지운 뒤라
   * 여기서는 아무 일도 일어나지 않는다.
   */
  settleDraft(): void {
    const last = state.turns.at(-1)
    if (!last || last.draft.length === 0) return
    const merged = { ...last, draft: '', text: joined(last.text, last.draft) }
    emit({ ...state, turns: [...state.turns.slice(0, -1), merged] })
  },
  setStatus(status: SessionStatus): void {
    if (state.status === status) return
    emit({ ...state, status })
  },
  setPermission(permission: PermissionAsk | null): void {
    emit({ ...state, permission })
  },
  reset(): void {
    emit({ turns: [], status: 'done', permission: null })
  },
}
