/**
 * 서브에이전트(자식) 관련 stream-json 조각을 도메인 이벤트로 번역한다.
 *
 * 서브에이전트 (`--forward-subagent-text`, 2.1.229 실측).
 * 열림은 Agent/Task tool_use (turn.ts 의 fromAssistant 가 낸다),
 * 말은 parent_tool_use_id 가 붙은 메시지,
 * 닫힘은 그 tool_use 의 tool_result 다. tool_result 는 모든 도구가 내므로
 * 어느 것이 자식의 것인지는 열림을 지켜본 러너가 가른다.
 */
import { resultText, toolLine } from './shared'

export type ChildTurnEvent =
  | { type: 'childOpen'; toolUseId: string; label: string; prompt: string; background: boolean }
  | { type: 'childSay'; toolUseId: string; role: 'user' | 'assistant'; text: string }
  /** 자식의 도구 활동 — 자식 타일의 2층이다 (실측: tool_use 블록도 parent 를 달고 온다) */
  | { type: 'childStream'; toolUseId: string; line: string }
  | { type: 'childClosed'; toolUseId: string; error?: string }
  /**
   * 백그라운드 자식의 완료 알림 (system/task_notification, 2026-08-13 실측).
   * 백그라운드 자식의 tool_result 는 접수증이라 닫힘이 아니다 — 진짜 완료는 이것이다.
   */
  | { type: 'childNotified'; toolUseId: string; summary: string }

/**
 * parent 가 붙은 메시지 — 자식의 말과 도구 활동이다. 부모의 층으로 새면 안 된다.
 * text 는 자식의 1층·전문으로, tool_use 는 자식의 2층으로 간다.
 */
export function childSays(
  event: Record<string, unknown>,
  toolUseId: string,
  role: 'user' | 'assistant',
): ChildTurnEvent[] {
  const content = (event.message as Record<string, unknown> | undefined)?.content
  if (!Array.isArray(content)) return []
  const out: ChildTurnEvent[] = []
  for (const block of content as Record<string, unknown>[]) {
    if (block.type === 'text' && typeof block.text === 'string' && block.text.length > 0) {
      out.push({ type: 'childSay', toolUseId, role, text: block.text })
    }
    if (block.type === 'tool_use' && typeof block.name === 'string') {
      out.push({ type: 'childStream', toolUseId, line: toolLine(block.name, block.input) })
    }
  }
  return out
}

export function childCloses(event: Record<string, unknown>): ChildTurnEvent[] {
  const content = (event.message as Record<string, unknown> | undefined)?.content
  if (!Array.isArray(content)) return []
  const out: ChildTurnEvent[] = []
  for (const block of content as Record<string, unknown>[]) {
    if (block.type === 'tool_result' && typeof block.tool_use_id === 'string') {
      // 실패로 죽은 자식은 이유를 들고 닫힌다 — 조용히 사라지면 화면이 거짓말이 된다
      const error =
        block.is_error === true ? resultText(block.content) : undefined
      out.push(
        error !== undefined
          ? { type: 'childClosed', toolUseId: block.tool_use_id, error }
          : { type: 'childClosed', toolUseId: block.tool_use_id },
      )
    }
  }
  return out
}

export function childNotified(event: Record<string, unknown>): ChildTurnEvent[] {
  if (typeof event.tool_use_id !== 'string') return []
  return [
    {
      type: 'childNotified',
      toolUseId: event.tool_use_id,
      summary: typeof event.summary === 'string' ? event.summary : '',
    },
  ]
}
