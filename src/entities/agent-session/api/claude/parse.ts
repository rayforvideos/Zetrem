/**
 * stream-json 한 줄을 도메인 이벤트로 번역한다 — 조립만 한다.
 * 이 계층은 순수 함수다 — IPC 도 프로세스도 모른다. 그래서 CLI 없이 테스트된다.
 *
 * 실제 번역은 네 파서가 나눠 진다: turn(대화) · child(자식) · permission(권한) ·
 * status(계기, Task 3). 한 파일이 넷을 다 지면 500줄이 넘고, 그러면 아무도 전체를
 * 한눈에 들고 못 있는다.
 */
import { childCloses, childNotified, childSays } from './child'
import type { ChildTurnEvent } from './child'
import { fromControlRequest } from './permission'
import type { PermissionEvent } from './permission'
import { fromStatusLine } from './status'
import type { StatusEvent } from './status'
import { fromAssistant, fromResult, fromStreamEvent, fromToolResult } from './turn'
import type { TurnEvent } from './turn'

export type { PermissionAlwaysResult, PermissionResult } from './permission'
export { permissionAlwaysResult, permissionResult } from './permission'

export type ClaudeTurnEvent = TurnEvent | ChildTurnEvent | PermissionEvent | StatusEvent

export function parseClaudeLine(line: string): ClaudeTurnEvent[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(line)
  } catch {
    // CLI 는 stream-json 사이에 잡음을 낼 수 있다 — 파싱 실패는 오류가 아니다
    return []
  }
  if (typeof parsed !== 'object' || parsed === null) return []
  const event = parsed as Record<string, unknown>
  const parent = typeof event.parent_tool_use_id === 'string' ? event.parent_tool_use_id : null

  // 계기는 대화와 같은 줄에서 나온다 (assistant 한 줄이 말과 usage 를 함께 실어 온다) —
  // 분기를 가로채지 않고 대화 이벤트와 합친다
  return [...fromStatusLine(event), ...turns(event, parent)]
}

function turns(event: Record<string, unknown>, parent: string | null): ClaudeTurnEvent[] {
  if (event.type === 'assistant') {
    return parent ? childSays(event, parent, 'assistant') : fromAssistant(event)
  }
  if (event.type === 'user') {
    return parent ? childSays(event, parent, 'user') : [...childCloses(event), ...fromToolResult(event)]
  }
  if (event.type === 'result') return fromResult(event)
  if (event.type === 'stream_event') return fromStreamEvent(event)
  if (event.type === 'control_request') return fromControlRequest(event)
  if (event.type === 'system' && event.subtype === 'task_notification') return childNotified(event)
  return []
}
