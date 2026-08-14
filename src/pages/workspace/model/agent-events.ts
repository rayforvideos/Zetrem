import { sessionStore, statusStore } from '@/entities/agent-session'
import type { ClaudeTurnEvent, RateLimit, ResultMetrics } from '@/entities/agent-session'
import { formatResetTime } from '@/shared/lib/datetime'
import { formatTokens, limitKindLabel } from '@/shared/lib/units'
import { conversation } from './conversation'

/** 1층 headline 상한 — 읽는 층이지만 문단을 담는 자리는 아니다 (스펙 §5.1) */
const HEADLINE_MAX = 140

/**
 * 훅의 ref 가 들고 있는, 이 세션 인스턴스에만 속하는 상태 — 답을 기다리는 권한 질문 큐와
 * 살아 있는 자식 tool_use id 들. `conversation`·`statusStore`·`sessionStore` 는 모듈
 * 싱글턴이라 여기서 바로 부른다; 이 둘만 인스턴스마다 달라서 인자로 받는다.
 */
export type AgentEventRefs = {
  asks: { requestId: string; toolName: string; input: unknown }[]
  childIds: Set<string>
}

/**
 * 파싱된 이벤트 한 개를 대화·계기·자식 타일에 반영한다.
 *
 * `use-agent.ts` 의 이벤트 루프 본문이었던 순수 로직 — 훅 밖으로 뺀 이유는 하나다:
 * vitest 가 node 환경으로 돌아 훅을 직접 테스트할 길이 없다. 여기 있으면 순수 함수라
 * 이벤트를 하나 만들어 넣고 conversation·statusStore 가 어떻게 변했는지 그냥 본다.
 */
export function applyAgentEvent(turn: ClaudeTurnEvent, refs: AgentEventRefs): void {
  if (turn.type === 'headline') conversation.say('assistant', turn.text)
  if (turn.type === 'stream') conversation.tool(turn.line, turn.toolUseId, turn.input)
  if (turn.type === 'delta') conversation.delta(turn.text)
  if (turn.type === 'thinking') conversation.think(turn.text)
  // 차례가 끝났는데 초안이 남아 있으면 확정 메시지가 오지 않은 것이다 (assistant 메시지는
  // result 보다 먼저 온다) — 그 글은 이미 사람이 읽은 것이니 확정본으로 앉힌다.
  // 맥동하는 커서는 draft 가 비면서 저절로 멈춘다
  if (turn.type === 'turnEnded') {
    conversation.settleDraft()
    conversation.setStatus('waiting')
  }
  // 자식의 도구 결과는 이미 파서 단계에서 갈라진다 — child.ts 의 childSays 는
  // parent 가 붙은 메시지에서 text·tool_use 만 읽고 tool_result 는 보지 않는다.
  // 그러니 여기 오는 toolResult 는 전부 부모 층의 결과다 (부모 자신의 Agent/Task
  // 도구가 낸 결과도 포함 — 그 결과는 부모의 눈금이 받아야 할 자기 것이다)
  if (turn.type === 'toolResult') {
    conversation.toolResult(turn.toolUseId, {
      stdout: turn.stdout,
      stderr: turn.stderr,
      isError: turn.isError,
      interrupted: turn.interrupted,
    })
  }

  // 계기의 층 — 컨텍스트·비용·한도·훅·활동·압축은 상태줄과 서랍이 먹는 재료다.
  // 아래 사건 문장들이 statusStore.get() 을 읽기 전에 반드시 먼저 반영된다 —
  // 턴 결산의 차액(lastTurnUsd)은 apply 안에서 계산되기 때문이다.
  if (
    turn.type === 'session' || turn.type === 'context' || turn.type === 'metrics' ||
    turn.type === 'limit' || turn.type === 'hookStarted' || turn.type === 'hookDone' ||
    turn.type === 'activity' || turn.type === 'compacted'
  ) {
    statusStore.apply(turn)
  }

  // 사건은 대화에도 남는다 — 지금 값이 아니라 그때 일어난 일이라 시간 위에 선다
  if (turn.type === 'limit' && turn.limit.status !== 'allowed') {
    conversation.system(limitLine(turn.limit))
  }
  if (turn.type === 'compacted') {
    conversation.system(compactedLine(turn.trigger, turn.preTokens, turn.postTokens))
  }
  if (turn.type === 'metrics') {
    if (turn.metrics.apiErrorStatus) {
      conversation.system(`API 오류 ${turn.metrics.apiErrorStatus}`)
    }
    conversation.system(turnLine(turn.metrics, statusStore.get().cost.lastTurnUsd))
  }

  if (turn.type === 'permission') {
    refs.asks.push(turn)
    if (refs.asks.length === 1) {
      conversation.setPermission({ requestId: turn.requestId, toolName: turn.toolName, line: turn.line })
    }
    conversation.setStatus('waiting')
  }
  if (turn.type === 'childOpen') {
    refs.childIds.add(turn.toolUseId)
    sessionStore.open({
      id: turn.toolUseId,
      runnerId: 'subagent',
      label: turn.label,
      model: 'subagent',
      status: 'working',
      headline: turn.prompt.slice(0, HEADLINE_MAX),
      stream: [],
      transcript: [],
      tokens: 0,
      contextUsed: 0,
      startedAtMs: Date.now(),
    })
  }
  if (turn.type === 'childSay' && refs.childIds.has(turn.toolUseId)) {
    sessionStore.patch(turn.toolUseId, { headline: turn.text.slice(0, HEADLINE_MAX) })
    sessionStore.appendTranscript(turn.toolUseId, { role: turn.role, text: turn.text })
  }
  if (turn.type === 'childStream' && refs.childIds.has(turn.toolUseId)) {
    sessionStore.pushStream(turn.toolUseId, turn.line)
  }
  if (turn.type === 'childNotified' && refs.childIds.has(turn.toolUseId)) {
    if (turn.summary) {
      sessionStore.patch(turn.toolUseId, { headline: turn.summary.slice(0, HEADLINE_MAX) })
    }
    refs.childIds.delete(turn.toolUseId)
    sessionStore.patch(turn.toolUseId, { status: 'done' })
  }
  /**
   * 닫는 것은 **실패했을 때뿐**이다.
   *
   * Agent 도구의 tool_result 는 이 CLI 에서 완료가 아니라 **접수증**이다 —
   * 앱 실기 기록(2026-08-14): 열림 02:00:03.867 → 결과 02:00:03.964, 97ms 뒤에
   * "Async agent launched successfully" 가 온다. `run_in_background` 는 붙지도 않으므로
   * 그 플래그로는 접수증과 완료를 가를 수 없다. 성공을 여기서 닫으면 모든 자식 타일이
   * 태어난 지 한 순간에 사라진다 (2026-08-14 회귀, 실기에서 잡혔다).
   *
   * 성공의 완료는 `childNotified`(task_notification)가 알린다. 실패만 여기서 닫는 이유는,
   * 죽은 자식은 완료 알림을 남기지 않고 이유는 화면에 있어야 하기 때문이다.
   */
  if (turn.type === 'childClosed' && turn.error && refs.childIds.has(turn.toolUseId)) {
    sessionStore.patch(turn.toolUseId, {
      status: 'done',
      headline: `실패 — ${turn.error.slice(0, 120)}`,
    })
    refs.childIds.delete(turn.toolUseId)
  }
}

/** 한도는 사실만 말한다 — 겁주지 않고, 손쓸 수 있는 값(초기화 시각)을 함께 준다 */
export function limitLine(limit: RateLimit): string {
  const percent = Math.round(limit.utilization * 100)
  const when = formatResetTime(limit.resetsAtMs)
  const overage = limit.overage ? ' · 초과분 사용 중' : ''
  return `${limitKindLabel(limit.kind)} 한도 ${percent}% 사용 — ${when} 초기화${overage}`
}

/**
 * 압축 사건 한 줄 — trigger·pre·post 세 값이 다 있으면 무엇이 왜 줄었는지 말하고,
 * 하나라도 모르면 빈 괄호나 "null" 을 찍는 대신 아는 것만 남긴다 (모르는 것은 그리지 않는다).
 */
export function compactedLine(
  trigger: string | null,
  preTokens: number | null,
  postTokens: number | null,
): string {
  const base = '여기서 대화가 압축됐습니다'
  if (preTokens === null || postTokens === null) return `${base} — 앞의 내용은 요약으로 남습니다`
  const shrink = `${formatTokens(preTokens)} → ${formatTokens(postTokens)}`
  const cause = triggerLabel(trigger)
  return cause ? `${base} (${cause}) — ${shrink}` : `${base} — ${shrink}`
}

export function triggerLabel(trigger: string | null): string | null {
  if (trigger === 'auto') return '자동'
  if (trigger === 'manual') return '수동'
  // 셋째 값이 늘어도 영어 토큰을 그대로 찍지 않는다 — 차라리 괄호를 뺀다
  return null
}

/** 턴 결산 — 비용은 세션 누적이라 차액을 쓴다 (실측 근거: 스펙 §실측 1) */
export function turnLine(metrics: ResultMetrics, turnUsd: number): string {
  const seconds = (metrics.durationMs / 1000).toFixed(1)
  const cost = turnUsd > 0 ? ` · $${turnUsd.toFixed(4)}` : ''
  return `이 턴 ${metrics.tokens.out.toLocaleString('ko-KR')}출력 · ${seconds}초${cost}`
}
