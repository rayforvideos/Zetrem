# 3회차 2번 — 권한 프롬프트 중계 (구현됨, 2026-08-13)

## 문제

headless Claude Code(`-p`)는 도구 권한을 자동 거부한다. 실제 에이전트의 "대기" 중
절반은 권한 승인인데, 지금 타일의 `waiting` 은 턴 종료만 잡는다. 승인이 필요한 작업
(파일 수정, Bash)은 지금 조용히 거부되고 에이전트가 "할 수 없다" 고 답한다.

## 실측 결과 (2026-08-13, claude 2.1.228)

- `--permission-prompt-tool` 플래그 **없음** — MCP 위임 경로는 이 버전에 존재하지 않는다
- stream-json 출력에 대화형 권한 요청 이벤트(control_request 류) **없음**
- headless 는 사용자의 평소 권한 설정을 물려받는다 — `date` 는 그냥 실행됐다
  (`tool_use` → `tool_result` 관측). 거부는 `result.permission_denials` 배열에만 남는다
- **적용한 v1**: `permission_denials` 를 파싱해 2층에 "권한 거부됨 <도구>" 로 드러낸다.
  중계가 아니라 가시화다 — 중계는 CLI 가 프로토콜을 열어줄 때 다시 본다

## 재실측 (2026-08-13, claude 2.1.229) — 프로토콜이 있다

`--permission-prompt-tool` 은 여전히 help 에 없지만 **숨겨진 플래그로 존재**하고,
`--permission-prompt-tool stdio` 를 주면 권한 판단이 stream-json 제어 채널로 위임된다.
2.1.228 실측에서 못 본 이유: 플래그 없이는 control_request 가 나오지 않는다.
(stdin 을 닫은 채 재면 `Tool permission request failed: AbortError: Stream closed` 가
tool_result 로 남는다 — 이것이 프로토콜 존재의 첫 증거였다.)

### 계약 (실측)

요청 (CLI → stdout, 한 줄):

```json
{"type":"control_request","request_id":"<uuid>","request":{
  "subtype":"can_use_tool","tool_name":"Bash","display_name":"Bash",
  "input":{"command":"mkdir demo"},"description":"...",
  "permission_suggestions":[...],"blocked_path":"...","tool_use_id":"toolu_..."}}
```

응답 (stdin, 한 줄):

```json
{"type":"control_response","response":{"subtype":"success","request_id":"<uuid>",
  "response":{"behavior":"allow","updatedInput":{...}}}}
```

- **allow 는 `updatedInput` 필수** — 원래 input 을 그대로 되돌려준다
- deny 는 `{"behavior":"deny","message":"..."}` — message 가 tool_result(is_error) 로
  에이전트에게 전달되고, `result.permission_denials` 에 기록된다 (양쪽 다 실측)
- 턴은 응답이 올 때까지 멈춘다. 응답하면 도구가 실제로 실행됐다 (mkdir 확인)

## 구현 (2026-08-13)

원안(1번)의 stdio 변형 — MCP 서버 없이 같은 그림이 된다:

- `agent-host`: spawn 인자에 `--permission-prompt-tool stdio`, `agent:permission` IPC 가
  control_response 봉투를 stdin 에 쓴다. 판정 내용은 렌더러의 순수 파서가 만든다
- `parse.ts`: control_request(can_use_tool) → `permission` 이벤트, `permissionResult()` 순수 함수
- 세션에 `permission?: PermissionAsk` — 권한 대기와 턴 종료 대기를 이 필드로 구분한다
  (예견했던 "구분할 필드"). status 는 둘 다 `waiting` 이라 시선 규칙이 그대로 작동한다
- claude 러너: 질문 큐(겹치면 하나씩), `RunHandle.decide(allow)`
- `AgentTile`: 질문이 올라오면 답 창구 대신 "<도구> 실행을 허용할까요?" + 실행 대상 원문
  + 허용/거부. 시선의 주인에게만 배선된다 (기존 onReply 와 같은 규칙)

검증: CDP 실기 — "mkdir 실행해줘" → 질문 표시(waiting) → 허용 클릭 → working 복귀 →
worktree 에 디렉토리 생성, permission_denials 비어 있음. deny 경로는 프로브로 확인.

## 방향 (원안 — CLI 가 지원할 때)

1. **`--permission-prompt-tool` + MCP 서버** — Claude Code 가 권한 판단을 MCP 도구에
   위임한다. agent-host 가 로컬 MCP 서버(stdio)를 하나 띄우고, 권한 요청이 오면
   렌더러로 push → 타일이 `waiting` + "Bash 실행을 허용할까요?" 헤드라인 + 응답 창구
   → 답이 allow/deny 로 돌아간다. **기존 waiting/답하기 구조에 정확히 얹힌다.**
2. 차선: `--permission-mode acceptEdits` 토글을 타이틀바에 — 중계가 아니라 우회.
   시선 규칙과 "사람이 승인한다" 는 제품 서사가 죽으므로 1번이 안 될 때만.

## 구현 시 주의

- 권한 요청의 waiting 과 턴 종료의 waiting 을 구분할 필드가 세션에 필요할 수 있다
  (응답 창구의 placeholder 와 전송 대상이 다르다 — 하나는 stdin, 하나는 MCP 응답)
- claude-api 스킬로 `--permission-prompt-tool` 의 정확한 계약을 먼저 확인할 것
- 검증은 이번 회차처럼 CDP 실기로 — "Bash 로 date 실행해줘" 가 좋은 시나리오

## 3번 (N개 병렬 Claude) 은 이것 다음

worktree 격리와 묶인다. agent-host 는 이미 Map 으로 여러 프로세스를 받는다 —
막힌 건 UI(프롬프트 1개 → 세션 1개)와 같은 cwd 충돌뿐이다.

## 항상 허용 (2026-08-13 추가 실측)

- control_response 의 `updatedPermissions` 에 `{type: addRules, rules, behavior: allow,
  destination: session}` 을 실으면 이후 같은 규칙의 질문이 사라진다 (실측: 질문 1번에 mkdir 3개).
- **CLI 의 permission_suggestions 는 명령 prefix 단위라 폭풍을 못 끈다** — 서브에이전트가
  도구를 연발하는 시나리오(실측 11회 질문)의 해법은 도구 단위 규칙(`{toolName}` 만,
  ruleContent 없음)이다. 실측: "이 세션에선 항상 허용" 1번 → 질문 1번.
- destination 은 session 고정 — 이 앱이 사용자 설정 파일을 쓰는 일은 없어야 한다.
