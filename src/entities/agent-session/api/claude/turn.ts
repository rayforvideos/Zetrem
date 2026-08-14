/**
 * 부모 대화(assistant/result)의 stream-json 조각을 도메인 이벤트로 번역한다.
 *
 * 매핑 (스펙 2026-08-13 §CLI 계약):
 *   assistant.text     → 1층 headline
 *   assistant.tool_use → 2층 stream
 *   result             → turnEnded (프로세스는 살아서 다음 입력을 기다린다)
 *
 * 계기(컨텍스트·비용·한도)는 여기서 나지 않는다 — `status.ts` 가 assistant 의 usage 와
 * result 를 따로 읽어 `context`·`metrics` 로 낸다. 이 파일이 한때 냈던 `meter` 는 그
 * 자리를 잃고 아무도 받지 않는 이벤트로 남아 있어 걷어냈다 (2026-08-14).
 */
import type { ChildTurnEvent } from './child'
import { resultText, toolLine } from './shared'

export type TurnEvent =
  | { type: 'headline'; text: string }
  // toolUseId 가 있어야 나중에 오는 결과를 이 눈금에 붙일 수 있다.
  // input 은 도구 원본 입력 — 전용 렌더(diff·체크리스트)의 재료다
  | { type: 'stream'; line: string; toolUseId: string | null; input: unknown }
  | { type: 'turnEnded' }
  // 부분 메시지의 텍스트 델타 — 초안. headline 과 달리 아직 확정되지 않았다
  | { type: 'delta'; text: string }
  // 생각 — 읽으라고 있는 문장이지만 결론은 아니다. 확정된 것만 낸다 (실측: 빈 문자열도 온다)
  | { type: 'thinking'; text: string }
  // 도구가 낸 출력 — 자식의 것인지 부모의 것인지는 러너가 childIds 로 가른다
  | { type: 'toolResult'; toolUseId: string; stdout: string; stderr: string; isError: boolean; interrupted: boolean }
  // 서브에이전트의 탄생은 fromAssistant 안에서 나므로 여기서도 나를 수 있어야 한다
  | Extract<ChildTurnEvent, { type: 'childOpen' }>

export function fromAssistant(event: Record<string, unknown>): TurnEvent[] {
  const message = event.message as Record<string, unknown> | undefined
  const content = message?.content
  if (!Array.isArray(content)) return []

  const out: TurnEvent[] = []
  for (const block of content as Record<string, unknown>[]) {
    if (block.type === 'text' && typeof block.text === 'string' && block.text.length > 0) {
      out.push({ type: 'headline', text: block.text })
    }
    // 생각은 읽으라고 있는 문장이지만 결론은 아니다 — 본문과 갈라서 낸다.
    // 실측(2026-08-14): thinking 블록은 늘 오지만 thinking 텍스트가 빈 문자열일 수 있다 —
    // 그때는 아무 이벤트도 내지 않는다. "생각 0문단" 은 없는 것을 있다고 말하는 거짓말이다
    if (block.type === 'thinking' && typeof block.thinking === 'string' && block.thinking.length > 0) {
      out.push({ type: 'thinking', text: block.thinking })
    }
    if (block.type === 'tool_use' && typeof block.name === 'string') {
      out.push({
        type: 'stream',
        line: toolLine(block.name, block.input),
        toolUseId: typeof block.id === 'string' ? block.id : null,
        input: block.input,
      })
      // 서브에이전트의 탄생 — Task 는 이 도구의 옛 이름이다 (버전에 따라 다르다)
      if ((block.name === 'Agent' || block.name === 'Task') && typeof block.id === 'string') {
        const input = block.input as Record<string, unknown> | undefined
        out.push({
          type: 'childOpen',
          toolUseId: block.id,
          label: childLabel(block),
          // 자식이 첫 마디를 하기 전까지 타일이 텅 비지 않게 — 받은 일감이 첫 화면이다
          prompt: typeof input?.prompt === 'string' ? input.prompt : '',
          // 백그라운드 자식의 tool_result 는 접수증이지 완료가 아니다 (2026-08-13 실측) —
          // 이 플래그가 없으면 타일이 태어나자마자 닫힌다
          background: input?.run_in_background === true,
        })
      }
    }
  }
  return out
}

/** 사람이 읽을 자식의 이름 — 부모가 시킬 때 붙인 설명이 가장 좋다 */
function childLabel(block: Record<string, unknown>): string {
  const input = block.input as Record<string, unknown> | undefined
  if (typeof input?.description === 'string' && input.description.length > 0)
    return input.description
  if (typeof input?.subagent_type === 'string' && input.subagent_type.length > 0)
    return input.subagent_type
  return typeof block.name === 'string' ? block.name : '서브에이전트'
}

/**
 * 부분 메시지의 텍스트 델타 — **초안**이다.
 *
 * 실측(2026-08-14): 델타가 흐른 뒤 완성된 assistant 메시지가 같은 내용으로 또 온다.
 * 이어붙이면 같은 문장이 두 번 뜨므로, 초안은 확정본이 도착할 때 버려진다.
 */
export function fromStreamEvent(event: Record<string, unknown>): TurnEvent[] {
  if (typeof event.parent_tool_use_id === 'string') return []
  const inner = event.event as Record<string, unknown> | undefined
  if (inner?.type !== 'content_block_delta') return []
  const delta = inner.delta as Record<string, unknown> | undefined
  if (delta?.type !== 'text_delta' || typeof delta.text !== 'string') return []
  return [{ type: 'delta', text: delta.text }]
}

export function fromResult(event: Record<string, unknown>): TurnEvent[] {
  const out: TurnEvent[] = []
  // headless 는 사용자의 권한 설정을 물려받고, 거부는 여기에만 기록된다.
  // 조용히 삼키면 에이전트가 "할 수 없다" 고만 답해 이유가 화면에 없다 (2026-08-13 프로토콜 실측)
  const denials = event.permission_denials
  if (Array.isArray(denials)) {
    for (const denial of denials as Record<string, unknown>[]) {
      const tool = typeof denial.tool_name === 'string' ? denial.tool_name : '도구'
      out.push({ type: 'stream', line: `권한 거부됨 ${tool}`, toolUseId: null, input: null })
    }
  }
  out.push({ type: 'turnEnded' })
  return out
}

/**
 * `user` 의 `tool_result` 를 도구 결과 이벤트로 낸다.
 *
 * child.ts 의 childCloses 도 같은 tool_result 를 본다 — 자식 닫힘 후보와 도구 결과는
 * 둘 다 낸다. 어느 쪽이 진짜 쓸 이벤트인지는 파서가 모른다; 열림을 지켜본 러너
 * (use-agent 의 childIds) 가 가른다.
 */
export function fromToolResult(event: Record<string, unknown>): TurnEvent[] {
  const content = (event.message as Record<string, unknown> | undefined)?.content
  if (!Array.isArray(content)) return []
  const detail = event.tool_use_result as Record<string, unknown> | undefined
  const out: TurnEvent[] = []
  for (const block of content as Record<string, unknown>[]) {
    if (block.type !== 'tool_result' || typeof block.tool_use_id !== 'string') continue
    out.push({
      type: 'toolResult',
      toolUseId: block.tool_use_id,
      // 실측: stdout 은 tool_use_result 에 오고, 없는 도구도 있어 content 로 되돌린다
      stdout: typeof detail?.stdout === 'string' ? detail.stdout : resultText(block.content),
      stderr: typeof detail?.stderr === 'string' ? detail.stderr : '',
      isError: block.is_error === true,
      interrupted: detail?.interrupted === true,
    })
  }
  return out
}
