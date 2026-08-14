/**
 * 도구 권한 질문과 그 응답을 도메인 이벤트로 번역한다.
 *
 * 도구 권한 질문 (`--permission-prompt-tool stdio`, CLI 2.1.229 실측).
 * input 을 그대로 들고 다니는 이유: 허용 응답이 updatedInput 으로 입력을
 * 되돌려줘야 CLI 가 도구를 실행한다 — 파서 밖에서 다시 구할 방법이 없다.
 */
import { toolLine } from './shared'

export type PermissionEvent = {
  type: 'permission'
  requestId: string
  toolName: string
  line: string
  input: unknown
}

/**
 * control_response 에 실리는 판정. CLI 계약(can_use_tool 응답)이라 형태를 바꿀 수 없다.
 * allow 는 updatedInput 이 필수 — 입력을 되돌려주지 않으면 도구가 빈 입력으로 돈다.
 */
export type PermissionResult =
  | { behavior: 'allow'; updatedInput: unknown }
  | { behavior: 'deny'; message: string }

export function permissionResult(allow: boolean, input: unknown): PermissionResult {
  return allow
    ? { behavior: 'allow', updatedInput: input }
    : { behavior: 'deny', message: '사용자가 이 도구 실행을 거부했다' }
}

export type PermissionAlwaysResult = {
  behavior: 'allow'
  updatedInput: unknown
  updatedPermissions: unknown[]
}

/**
 * 항상 허용 — 이 도구를 이 세션에서 다시 묻지 않는 규칙을 함께 되돌려준다
 * (2026-08-13 실측: updatedPermissions 의 세션 규칙이 이후 요청을 없앤다).
 * CLI 의 제안(permission_suggestions)은 명령 prefix 단위라 폭풍을 못 끈다 —
 * "항상" 의 뜻은 도구 단위이므로 ruleContent 없이 toolName 만 담는다.
 * 목적지는 session 으로 고정한다 — 이 앱이 사용자 설정 파일을 쓰는 일은 없어야 한다.
 */
export function permissionAlwaysResult(toolName: string, input: unknown): PermissionAlwaysResult {
  return {
    behavior: 'allow',
    updatedInput: input,
    updatedPermissions: [
      { type: 'addRules', rules: [{ toolName }], behavior: 'allow', destination: 'session' },
    ],
  }
}

/**
 * CLI 가 stdio 로 위임한 권한 판단. can_use_tool 만 우리 것이다 —
 * 모르는 제어 요청에 응답하면 CLI 쪽 상태를 망가뜨릴 수 있으므로 건드리지 않는다.
 */
export function fromControlRequest(event: Record<string, unknown>): PermissionEvent[] {
  const request = event.request as Record<string, unknown> | undefined
  if (request?.subtype !== 'can_use_tool') return []
  if (typeof event.request_id !== 'string') return []
  const toolName = typeof request.tool_name === 'string' ? request.tool_name : '도구'
  return [
    {
      type: 'permission',
      requestId: event.request_id,
      toolName,
      line: toolLine(toolName, request.input),
      input: request.input,
    },
  ]
}
