# TUI 정보 전량 노출 — 상태줄·서랍·대화 안쪽 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Claude Code CLI 가 stream-json 으로 내주는 정보 전부(세션 신원·컨텍스트·비용·사용량 한도·MCP·훅·생각·도구 결과·토큰 단위 스트리밍)와 CLI 업데이트 여부를 Zetrem 자체 GUI 에 노출한다.

**Architecture:** 순수 파서를 `turn`(대화) / `status`(계기) / `child`(자식) / `permission` 넷으로 쪼개고, 상태의 진실은 `statusStore` 하나가 든다. 지속하는 값은 화면 아래 상태줄과 그 서랍이 그리고, 일어난 사건(한도 경고·압축·오류·턴 결산)은 `conversation` 의 `system` 차례로 대화에 남는다. 업데이트만 stream-json 밖이라 메인 프로세스가 npm 레지스트리에 묻고, 설치는 사람이 버튼으로 시작한다.

**Tech Stack:** Electron 43 + electron-vite, React 19, TypeScript 7, Tailwind 4 + shadcn, vitest 4 (environment: `node`), Claude Code CLI 2.1.231. **새 의존성은 추가하지 않는다.**

**Spec:** `docs/superpowers/specs/2026-08-14-status-surface.md`

## Global Constraints

- **새 npm 의존성 금지.** 버전 비교·레지스트리 조회·diff 계산 전부 표준 라이브러리와 손으로 쓴 순수 함수로 한다.
- **모르는 값은 그리지 않는다.** `null` 은 "아직 모른다"이고, 그 칸은 자리를 비워두는 대신 아예 렌더하지 않는다 (한 프레임이 거짓말하지 않게 — 6회차 설정 로딩 원칙).
- **색을 들이지 않는다.** 모든 글자는 100% `currentColor`. 알파가 걸리는 것은 선·눈금·칩의 테두리뿐 (시각 스펙 §4.2). 경고는 색이 아니라 **어절과 선 굵기**로 말한다.
- **세 목소리 세 활자 유지.** 사람의 말 = 산세리프 13px/75%, 에이전트의 말 = 세리프 15.5/1.68, 기계가 한 일 = 고정폭 11px. 새로 붙는 것은 이 셋 중 하나에 속해야 한다.
- **파서는 순수 함수.** IPC·프로세스·`window` 를 모른다. CLI 없이 테스트된다.
- 테스트 환경은 `node` 다 — jsdom 이 없다. 컴포넌트 테스트는 `react-dom/server` 의 `renderToStaticMarkup` 으로 마크업 문자열을 검사한다 (기존 `AgentTile.test.tsx` 방식).
- 숫자는 `tabular-nums` — 상태줄의 값이 바뀔 때 자리가 흔들리면 안 된다.
- 서랍 최대 높이 `40vh`, 그 안에서 스크롤.
- 주석과 커밋 메시지는 한국어. 주석은 "왜" 를 적는다 ("무엇" 은 코드가 말한다).
- 실측 상수 (스펙 근거): 비용 `total_cost_usd` 는 **세션 누적**, 컨텍스트 사용량 = `usage.input_tokens + cache_read_input_tokens + cache_creation_input_tokens`, `contextWindow` 는 `result.modelUsage[…]` 에서만 온다, `--include-partial-messages` 의 델타 뒤에 완성된 `assistant` 가 **또** 온다.
- 매 태스크 끝에 `npm test` 와 `npm run typecheck` 가 모두 통과해야 커밋한다.

---

### Task 1: 열어둔 두 값을 실측으로 닫는다

스펙이 두 가지를 열어뒀다: thinking 블록이 확정 `assistant` 메시지에도 오는지, `compact_boundary` 의 실제 필드 모양. 추측으로 파서를 쓰면 Task 4·10 이 헛돈다.

**Files:**
- Create: `docs/superpowers/notes/2026-08-14-stream-shapes.md`

- [ ] **Step 1: thinking 이 어디로 오는지 관측**

`~/.claude/settings.json` 을 건드리지 말고, 프로브 디렉토리에서 생각을 유도하는 프롬프트를 던진다. 스크래치패드에서:

```bash
mkdir -p /tmp/zt-probe && cd /tmp/zt-probe
echo '{"type":"user","message":{"role":"user","content":[{"type":"text","text":"17 * 23 을 암산으로 단계별로 깊이 생각해서 풀어줘."}]}}' \
  | claude -p --input-format stream-json --output-format stream-json --verbose \
    --include-partial-messages --dangerously-skip-permissions > think.jsonl 2>/dev/null
python3 -c "
import json
for l in open('think.jsonl'):
    e=json.loads(l)
    if e.get('type')=='assistant':
        print('ASSISTANT blocks:', [b.get('type') for b in e['message']['content']])
        print('  thinking_tokens:', e['message']['usage'].get('output_tokens_details'))
    if e.get('type')=='stream_event':
        ev=e['event']
        if ev['type']=='content_block_start': print('  BLOCK_START', ev['content_block'].get('type'))
        if ev['type']=='content_block_delta': print('  DELTA', ev['delta'].get('type'))
"
```

기록할 것: ① `assistant.message.content` 에 `thinking` 타입 블록이 있는가 ② `stream_event` 의 델타 타입에 `thinking_delta` 가 있는가.

- [ ] **Step 2: 압축 경계의 모양 관측**

압축을 실제로 일으키기는 비싸다. 대신 CLI 바이너리에서 그 이벤트가 실려 나가는 형태를 확인한다:

```bash
strings $(readlink -f $(which claude)) | grep -oE 'compact_boundary[^"]{0,80}|"trigger":"[a-z_]+"|pre_tokens|preTokens' | sort -u | head
```

`compact_boundary` 와 함께 나오는 필드 이름(`trigger`, `pre_tokens` 등)을 기록한다. 확정되지 않으면 **Task 4 의 파서는 `compact_boundary` 를 필드 없이 "여기서 압축됐다" 사건으로만 다룬다** — 모르는 필드를 읽는 코드를 쓰지 않는다.

- [ ] **Step 3: 관측을 기록한다**

`docs/superpowers/notes/2026-08-14-stream-shapes.md` 에 위 두 관측의 **실제 출력을 붙여넣고** 각각 한 줄로 결론을 쓴다:

```markdown
# 실측 — thinking 과 compact_boundary (claude 2.1.231)

## thinking
(여기에 Step 1 출력 그대로)

**결론:** thinking 은 (확정 assistant 에도 온다 / stream_event 로만 온다).
→ 파서 `turn.ts` 는 (양쪽 / stream_event) 에서 읽는다.

## compact_boundary
(여기에 Step 2 출력 그대로)

**결론:** 함께 오는 필드는 (…). 확인 안 된 필드는 읽지 않는다.
```

- [ ] **Step 4: 커밋**

```bash
git add docs/superpowers/notes/2026-08-14-stream-shapes.md
git commit -m "docs: thinking 과 compact_boundary 실측 — 파서가 읽을 자리를 확정"
```

---

### Task 2: 파서를 넷으로 쪼갠다 (행동 변화 없음)

`parse.ts` 260줄에 상태 10종을 더할 수 없다. 먼저 순수 리팩터로 자리를 만든다. **이 태스크는 기존 테스트 346줄이 한 줄도 안 바뀌고 통과해야 한다** — 통과하지 않으면 리팩터가 아니다.

**Files:**
- Create: `src/entities/agent-session/api/claude/turn.ts`
- Create: `src/entities/agent-session/api/claude/child.ts`
- Create: `src/entities/agent-session/api/claude/permission.ts`
- Create: `src/entities/agent-session/api/claude/shared.ts`
- Modify: `src/entities/agent-session/api/claude/parse.ts` (전량 대체 — 조립만 남는다)
- Test: `src/entities/agent-session/api/claude/parse.test.ts` (**수정 금지**)

**Interfaces:**
- Consumes: 없음
- Produces:
  - `shared.ts` → `export const STREAM_LINE_MAX = 120`, `export function toolLine(name: string, input: unknown): string`, `export function resultText(content: unknown): string`
  - `turn.ts` → `export type TurnEvent`, `export function fromAssistant(event: Record<string, unknown>): TurnEvent[]`, `export function fromResult(event: Record<string, unknown>): TurnEvent[]`
  - `child.ts` → `export type ChildTurnEvent`, `export function childSays(event, toolUseId, role): ChildTurnEvent[]`, `export function childCloses(event): ChildTurnEvent[]`, `export function childNotified(event): ChildTurnEvent[]`
  - `permission.ts` → `export type PermissionEvent`, `export function fromControlRequest(event): PermissionEvent[]`, `permissionResult`, `permissionAlwaysResult`, `PermissionResult`, `PermissionAlwaysResult`
  - `parse.ts` → `export type ClaudeTurnEvent = TurnEvent | ChildTurnEvent | PermissionEvent`, `export function parseClaudeLine(line: string): ClaudeTurnEvent[]` (기존 시그니처 그대로)

- [ ] **Step 1: 기존 테스트가 지금 통과하는 것을 먼저 확인한다**

Run: `npm test -- src/entities/agent-session/api/claude/parse.test.ts`
Expected: PASS (기준선. 여기서 실패하면 리팩터를 시작하지 않고 원인을 먼저 찾는다)

- [ ] **Step 2: `shared.ts` 로 공용 조각을 옮긴다**

`parse.ts` 의 `STREAM_LINE_MAX`, `TARGET_KEYS`, `toolLine`, `resultText` 를 그대로 옮기고 `export` 를 붙인다. 주석도 함께 옮긴다 — 주석이 그 값의 이유를 들고 있다.

```ts
/**
 * 파서 넷이 함께 쓰는 조각. 대화·자식·권한이 같은 방식으로 도구 한 줄을 만들어야
 * 화면의 눈금이 한 문법으로 읽힌다.
 */

/** 2층 한 줄의 상한. 읽는 층이 아니라 흐르는 층이다 (스펙 §5.2) */
export const STREAM_LINE_MAX = 120

/** 도구 입력에서 사람이 알아볼 대상 하나를 고른다 — 흔한 키 순서대로 */
const TARGET_KEYS = ['file_path', 'command', 'pattern', 'path', 'url', 'query'] as const

export function toolLine(name: string, input: unknown): string {
  let target = ''
  if (typeof input === 'object' && input !== null) {
    for (const key of TARGET_KEYS) {
      const value = (input as Record<string, unknown>)[key]
      if (typeof value === 'string' && value.length > 0) {
        target = value
        break
      }
    }
  }
  return `${name} ${target}`.trim().slice(0, STREAM_LINE_MAX)
}

/** tool_result 의 content 는 문자열이거나 text 블록 배열이다 — 둘 다에서 사람 말을 꺼낸다 */
export function resultText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return (content as Record<string, unknown>[])
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text as string)
      .join(' ')
  }
  return ''
}
```

- [ ] **Step 3: `turn.ts` · `child.ts` · `permission.ts` 로 나머지를 옮긴다**

기계적 이동이다. 새 로직을 쓰지 않는다.

- `turn.ts` ← `headline`/`stream`/`meter`/`turnEnded` 이벤트 타입 + `fromAssistant` + `fromResult` + `childLabel`(자식 열림이 `fromAssistant` 안에서 나므로 여기 남는다) — 단 `childOpen` 이벤트 타입은 `child.ts` 에서 import 한다
- `child.ts` ← `childOpen`/`childSay`/`childStream`/`childClosed`/`childNotified` 타입 + `childSays` + `childCloses` + `task_notification` 처리를 `childNotified(event)` 함수로
- `permission.ts` ← `permission` 이벤트 타입 + `fromControlRequest` + `permissionResult` + `permissionAlwaysResult` + 두 결과 타입

각 파일 머리에 그 파일이 무엇을 번역하는지 한 문단 주석을 남긴다.

- [ ] **Step 4: `parse.ts` 를 조립만 하는 파일로 만든다**

```ts
/**
 * stream-json 한 줄을 도메인 이벤트로 번역한다 — 조립만 한다.
 *
 * 실제 번역은 네 파서가 나눠 진다: turn(대화) · child(자식) · permission(권한) ·
 * status(계기, Task 3). 한 파일이 넷을 다 지면 500줄이 넘고, 그러면 아무도 전체를
 * 한눈에 들고 못 있는다.
 */
import { childCloses, childNotified, childSays } from './child'
import type { ChildTurnEvent } from './child'
import { fromControlRequest } from './permission'
import type { PermissionEvent } from './permission'
import { fromAssistant, fromResult } from './turn'
import type { TurnEvent } from './turn'

export type { PermissionAlwaysResult, PermissionResult } from './permission'
export { permissionAlwaysResult, permissionResult } from './permission'

export type ClaudeTurnEvent = TurnEvent | ChildTurnEvent | PermissionEvent

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
  if (event.type === 'assistant') {
    return parent ? childSays(event, parent, 'assistant') : fromAssistant(event)
  }
  if (event.type === 'user') {
    return parent ? childSays(event, parent, 'user') : childCloses(event)
  }
  if (event.type === 'result') return fromResult(event)
  if (event.type === 'control_request') return fromControlRequest(event)
  if (event.type === 'system' && event.subtype === 'task_notification') return childNotified(event)
  return []
}
```

- [ ] **Step 5: 기존 테스트가 그대로 통과하는 것을 확인한다**

Run: `npm test -- src/entities/agent-session/api/claude/parse.test.ts && npm run typecheck`
Expected: PASS — 테스트 파일을 한 글자도 고치지 않았는데 통과해야 한다. 실패하면 이동 중에 로직이 바뀐 것이므로 그 지점을 되돌린다.

- [ ] **Step 6: 커밋**

```bash
git add src/entities/agent-session/api/claude/
git commit -m "refactor: stream-json 파서를 turn·child·permission·shared 로 가른다

상태 10종을 더할 자리를 먼저 만든다. 기존 테스트 346줄을 한 줄도
고치지 않고 통과 — 행동은 바뀌지 않았다."
```

---

### Task 3: `status.ts` — 계기의 층을 번역한다

**Files:**
- Create: `src/entities/agent-session/api/claude/status.ts`
- Create: `src/entities/agent-session/api/claude/status.test.ts`
- Modify: `src/entities/agent-session/api/claude/parse.ts` (status 파서 물리기)
- Modify: `src/entities/agent-session/index.ts` (배럴에 타입 내보내기)

**Interfaces:**
- Consumes: `shared.ts` 의 것 없음 (독립)
- Produces:
```ts
export type McpServer = { name: string; status: string }
export type Counts = { tools: number; commands: number; agents: number; skills: number; plugins: number }
export type SessionIdentity = {
  id: string; cwd: string; model: string; permissionMode: string
  outputStyle: string; cliVersion: string; apiKeySource: string
  fastMode: { state: string; reason: string | null }
  mcp: McpServer[]; counts: Counts; memoryPaths: string[]
}
export type ResultMetrics = {
  costUsd: number
  tokens: { in: number; out: number; cacheRead: number; cacheCreate: number }
  durationMs: number; ttftMs: number | null; turns: number
  contextWindow: number | null
  apiErrorStatus: string | null; stopReason: string | null
}
export type RateLimit = {
  kind: string; utilization: number; resetsAtMs: number; overage: boolean; status: string
}
export type StatusEvent =
  | { type: 'session'; session: SessionIdentity }
  | { type: 'context'; used: number }
  | { type: 'metrics'; metrics: ResultMetrics }
  | { type: 'limit'; limit: RateLimit }
  | { type: 'hookStarted'; hookId: string; name: string; event: string }
  | { type: 'hookDone'; hookId: string; exitCode: number; stderr: string }
  | { type: 'activity'; activity: 'requesting' | 'idle' }
  | { type: 'compacted' }
export function fromStatusLine(event: Record<string, unknown>): StatusEvent[]
```

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`status.test.ts`. 페이로드는 스펙의 실측값을 그대로 쓴다 — 손으로 지어낸 모양으로 통과한 파서는 실기에서 아무것도 못 읽는다.

```ts
import { describe, expect, it } from 'vitest'
import { fromStatusLine } from './status'

/** 실측 init (claude 2.1.231) 에서 필요한 필드만 줄인 것 */
function initLine(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: 'system',
    subtype: 'init',
    cwd: '/Users/sam/workspace/zetrem',
    session_id: 'f77f771b-4d45-4551-b887-202b62a6edc5',
    model: 'claude-opus-5[1m]',
    permissionMode: 'acceptEdits',
    output_style: 'default',
    apiKeySource: 'none',
    claude_code_version: '2.1.231',
    fast_mode_state: 'off',
    fast_mode_disabled_reason: 'sdk_opt_in_required',
    tools: ['Bash', 'Read', 'Edit'],
    slash_commands: ['init', 'run'],
    agents: ['claude'],
    skills: ['dataviz'],
    plugins: [{ name: 'superpowers' }],
    mcp_servers: [
      { name: 'playwright', status: 'connected' },
      { name: 'claude.ai Notion', status: 'needs-auth' },
    ],
    memory_paths: { auto: '/Users/sam/.claude/projects/x/memory/' },
    ...overrides,
  }
}

describe('status 파서 — 계기의 층', () => {
  it('init 이 세션의 신원을 준다', () => {
    const [event] = fromStatusLine(initLine())
    expect(event).toEqual({
      type: 'session',
      session: {
        id: 'f77f771b-4d45-4551-b887-202b62a6edc5',
        cwd: '/Users/sam/workspace/zetrem',
        model: 'claude-opus-5[1m]',
        permissionMode: 'acceptEdits',
        outputStyle: 'default',
        cliVersion: '2.1.231',
        apiKeySource: 'none',
        fastMode: { state: 'off', reason: 'sdk_opt_in_required' },
        mcp: [
          { name: 'playwright', status: 'connected' },
          { name: 'claude.ai Notion', status: 'needs-auth' },
        ],
        counts: { tools: 3, commands: 2, agents: 1, skills: 1, plugins: 1 },
        memoryPaths: ['/Users/sam/.claude/projects/x/memory/'],
      },
    })
  })

  it('fast mode 가 켜져 있으면 꺼진 이유는 없다', () => {
    const [event] = fromStatusLine(initLine({ fast_mode_state: 'on', fast_mode_disabled_reason: undefined }))
    expect(event).toMatchObject({ type: 'session', session: { fastMode: { state: 'on', reason: null } } })
  })

  it('assistant 의 usage 합이 지금 컨텍스트 크기다 — result 를 기다리지 않는다', () => {
    // 실측: in 2 + cacheRead 16671 + cacheCreate 11691 = 28364,
    // 그리고 다음 턴의 cache_read 가 28362 로 일치했다 (스펙 §실측 2)
    const events = fromStatusLine({
      type: 'assistant',
      message: {
        usage: {
          input_tokens: 2,
          cache_read_input_tokens: 16671,
          cache_creation_input_tokens: 11691,
          output_tokens: 1,
        },
      },
    })
    expect(events).toEqual([{ type: 'context', used: 28364 }])
  })

  it('자식의 usage 는 부모의 컨텍스트가 아니다', () => {
    const events = fromStatusLine({
      type: 'assistant',
      parent_tool_use_id: 'toolu_1',
      message: { usage: { input_tokens: 5, cache_read_input_tokens: 100, cache_creation_input_tokens: 0 } },
    })
    expect(events).toEqual([])
  })

  it('result 가 계기판을 준다 — 비용은 세션 누적값 그대로 넘긴다', () => {
    const events = fromStatusLine({
      type: 'result',
      subtype: 'success',
      total_cost_usd: 0.166547,
      duration_ms: 10485,
      ttft_ms: 2352,
      num_turns: 3,
      stop_reason: 'end_turn',
      api_error_status: null,
      usage: {
        input_tokens: 6,
        output_tokens: 261,
        cache_read_input_tokens: 76424,
        cache_creation_input_tokens: 14862,
      },
      modelUsage: { 'claude-opus-5[1m]': { contextWindow: 1_000_000 } },
    })
    expect(events).toEqual([
      {
        type: 'metrics',
        metrics: {
          costUsd: 0.166547,
          tokens: { in: 6, out: 261, cacheRead: 76424, cacheCreate: 14862 },
          durationMs: 10485,
          ttftMs: 2352,
          turns: 3,
          contextWindow: 1_000_000,
          apiErrorStatus: null,
          stopReason: 'end_turn',
        },
      },
    ])
  })

  it('contextWindow 를 모르는 result 는 null 로 남긴다 — 기본값을 지어내지 않는다', () => {
    const [event] = fromStatusLine({ type: 'result', subtype: 'success', total_cost_usd: 0.1, usage: {} })
    expect(event).toMatchObject({ type: 'metrics', metrics: { contextWindow: null, ttftMs: null } })
  })

  it('rate_limit_event 를 한도로 옮긴다 — resetsAt 은 초라서 ms 로 바꾼다', () => {
    const events = fromStatusLine({
      type: 'rate_limit_event',
      rate_limit_info: {
        status: 'allowed_warning',
        resetsAt: 1787173200,
        rateLimitType: 'seven_day',
        utilization: 0.28,
        isUsingOverage: false,
      },
    })
    expect(events).toEqual([
      {
        type: 'limit',
        limit: {
          kind: 'seven_day',
          utilization: 0.28,
          resetsAtMs: 1787173200000,
          overage: false,
          status: 'allowed_warning',
        },
      },
    ])
  })

  it('훅은 시작과 끝이 따로 온다 — hook_id 로 이어붙이는 것은 스토어의 일이다', () => {
    expect(
      fromStatusLine({
        type: 'system',
        subtype: 'hook_started',
        hook_id: 'c3d7',
        hook_name: 'SessionStart:startup',
        hook_event: 'SessionStart',
      }),
    ).toEqual([{ type: 'hookStarted', hookId: 'c3d7', name: 'SessionStart:startup', event: 'SessionStart' }])

    expect(
      fromStatusLine({
        type: 'system',
        subtype: 'hook_response',
        hook_id: 'c3d7',
        hook_name: 'SessionStart:startup',
        exit_code: 0,
        stderr: '',
      }),
    ).toEqual([{ type: 'hookDone', hookId: 'c3d7', exitCode: 0, stderr: '' }])
  })

  it('system/status 는 지금 무엇을 하는 중인지 말한다', () => {
    expect(fromStatusLine({ type: 'system', subtype: 'status', status: 'requesting' })).toEqual([
      { type: 'activity', activity: 'requesting' },
    ])
  })

  it('압축 경계는 사건으로만 본다 — 확인 안 된 필드는 읽지 않는다', () => {
    expect(fromStatusLine({ type: 'system', subtype: 'compact_boundary' })).toEqual([
      { type: 'compacted' },
    ])
  })

  it('모르는 줄에는 아무 말도 하지 않는다', () => {
    expect(fromStatusLine({ type: 'system', subtype: '알수없음' })).toEqual([])
    expect(fromStatusLine({ type: 'stream_event', event: { type: 'message_start' } })).toEqual([])
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test -- src/entities/agent-session/api/claude/status.test.ts`
Expected: FAIL — `Failed to resolve import "./status"`

- [ ] **Step 3: `status.ts` 를 쓴다**

```ts
/**
 * stream-json 중 **계기의 층**을 번역한다 — 세션의 신원, 컨텍스트, 비용, 사용량 한도,
 * 훅, 진행 상태. 대화가 아니라 상태줄과 서랍이 먹는 재료다.
 *
 * 순수 함수 — 이어붙이기(훅의 시작·끝 짝짓기, 컨텍스트 누적)는 상태를 가진 스토어의 일이다.
 * 여기서 시간을 읽거나 이전 줄을 기억하면 CLI 없이 테스트할 수 없게 된다.
 */
export type McpServer = { name: string; status: string }

export type Counts = {
  tools: number
  commands: number
  agents: number
  skills: number
  plugins: number
}

export type SessionIdentity = {
  id: string
  cwd: string
  model: string
  permissionMode: string
  outputStyle: string
  cliVersion: string
  apiKeySource: string
  /** 빠른 모드는 꺼진 이유까지 말해야 사람이 손쓸 수 있다 */
  fastMode: { state: string; reason: string | null }
  mcp: McpServer[]
  counts: Counts
  memoryPaths: string[]
}

export type ResultMetrics = {
  /** 세션 누적이다 (실측: 0.125331 → 0.166547). 턴 차액은 스토어가 뺀다 */
  costUsd: number
  tokens: { in: number; out: number; cacheRead: number; cacheCreate: number }
  durationMs: number
  ttftMs: number | null
  turns: number
  /** 컨텍스트의 분모. result 에서만 온다 — 모르면 % 를 띄우지 않는다 */
  contextWindow: number | null
  apiErrorStatus: string | null
  stopReason: string | null
}

export type RateLimit = {
  kind: string
  utilization: number
  resetsAtMs: number
  overage: boolean
  status: string
}

export type StatusEvent =
  | { type: 'session'; session: SessionIdentity }
  | { type: 'context'; used: number }
  | { type: 'metrics'; metrics: ResultMetrics }
  | { type: 'limit'; limit: RateLimit }
  | { type: 'hookStarted'; hookId: string; name: string; event: string }
  | { type: 'hookDone'; hookId: string; exitCode: number; stderr: string }
  | { type: 'activity'; activity: 'requesting' | 'idle' }
  | { type: 'compacted' }

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function count(value: unknown): number {
  return Array.isArray(value) ? value.length : 0
}

export function fromStatusLine(event: Record<string, unknown>): StatusEvent[] {
  if (event.type === 'system') return fromSystem(event)
  if (event.type === 'assistant') return fromAssistantUsage(event)
  if (event.type === 'result') return fromResultMetrics(event)
  if (event.type === 'rate_limit_event') return fromRateLimit(event)
  return []
}

function fromSystem(event: Record<string, unknown>): StatusEvent[] {
  if (event.subtype === 'init') return [{ type: 'session', session: identity(event) }]
  if (event.subtype === 'status') {
    const activity = event.status === 'requesting' ? 'requesting' : 'idle'
    return [{ type: 'activity', activity }]
  }
  if (event.subtype === 'hook_started') {
    return [
      {
        type: 'hookStarted',
        hookId: str(event.hook_id),
        name: str(event.hook_name, '훅'),
        event: str(event.hook_event),
      },
    ]
  }
  if (event.subtype === 'hook_response') {
    return [
      {
        type: 'hookDone',
        hookId: str(event.hook_id),
        exitCode: num(event.exit_code),
        stderr: str(event.stderr),
      },
    ]
  }
  // 압축은 일어났다는 사실만 확실하다 — 함께 오는 필드는 실측되지 않았다 (notes 2026-08-14)
  if (event.subtype === 'compact_boundary') return [{ type: 'compacted' }]
  return []
}

function identity(event: Record<string, unknown>): SessionIdentity {
  const memory = event.memory_paths
  return {
    id: str(event.session_id),
    cwd: str(event.cwd),
    model: str(event.model, '알 수 없음'),
    permissionMode: str(event.permissionMode),
    outputStyle: str(event.output_style),
    cliVersion: str(event.claude_code_version),
    apiKeySource: str(event.apiKeySource),
    fastMode: {
      state: str(event.fast_mode_state, 'off'),
      // 켜져 있을 때 이유를 들고 있으면 화면이 거짓말을 한다
      reason:
        str(event.fast_mode_state, 'off') === 'off' && typeof event.fast_mode_disabled_reason === 'string'
          ? event.fast_mode_disabled_reason
          : null,
    },
    mcp: Array.isArray(event.mcp_servers)
      ? (event.mcp_servers as Record<string, unknown>[]).map((server) => ({
          name: str(server.name, '?'),
          status: str(server.status, 'unknown'),
        }))
      : [],
    counts: {
      tools: count(event.tools),
      commands: count(event.slash_commands),
      agents: count(event.agents),
      skills: count(event.skills),
      plugins: count(event.plugins),
    },
    memoryPaths:
      typeof memory === 'object' && memory !== null
        ? Object.values(memory as Record<string, unknown>).filter(
            (path): path is string => typeof path === 'string',
          )
        : [],
  }
}

/**
 * 컨텍스트는 result 를 기다리지 않는다 — 매 assistant 의 usage 합이 곧 지금 크기다
 * (실측: 2 + 16671 + 11691 = 28364, 다음 턴의 cache_read 28362 와 일치).
 * 자식(parent_tool_use_id)의 usage 는 자기 컨텍스트라 부모의 계기를 흔들면 안 된다.
 */
function fromAssistantUsage(event: Record<string, unknown>): StatusEvent[] {
  if (typeof event.parent_tool_use_id === 'string') return []
  const usage = (event.message as Record<string, unknown> | undefined)?.usage
  if (typeof usage !== 'object' || usage === null) return []
  const u = usage as Record<string, unknown>
  const used = num(u.input_tokens) + num(u.cache_read_input_tokens) + num(u.cache_creation_input_tokens)
  return used > 0 ? [{ type: 'context', used }] : []
}

function fromResultMetrics(event: Record<string, unknown>): StatusEvent[] {
  const usage = (event.usage as Record<string, unknown> | undefined) ?? {}
  const models = event.modelUsage as Record<string, Record<string, unknown>> | undefined
  const first = models ? Object.values(models)[0] : undefined
  const window = first ? num(first.contextWindow, 0) : 0
  return [
    {
      type: 'metrics',
      metrics: {
        costUsd: num(event.total_cost_usd),
        tokens: {
          in: num(usage.input_tokens),
          out: num(usage.output_tokens),
          cacheRead: num(usage.cache_read_input_tokens),
          cacheCreate: num(usage.cache_creation_input_tokens),
        },
        durationMs: num(event.duration_ms),
        ttftMs: typeof event.ttft_ms === 'number' ? event.ttft_ms : null,
        turns: num(event.num_turns),
        contextWindow: window > 0 ? window : null,
        apiErrorStatus: typeof event.api_error_status === 'string' ? event.api_error_status : null,
        stopReason: typeof event.stop_reason === 'string' ? event.stop_reason : null,
      },
    },
  ]
}

function fromRateLimit(event: Record<string, unknown>): StatusEvent[] {
  const info = event.rate_limit_info
  if (typeof info !== 'object' || info === null) return []
  const i = info as Record<string, unknown>
  return [
    {
      type: 'limit',
      limit: {
        kind: str(i.rateLimitType, '알 수 없음'),
        utilization: num(i.utilization),
        // 실측: resetsAt 은 epoch 초다. ms 로 바꿔 화면이 Date 로 바로 쓴다
        resetsAtMs: num(i.resetsAt) * 1000,
        overage: i.isUsingOverage === true,
        status: str(i.status),
      },
    },
  ]
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npm test -- src/entities/agent-session/api/claude/status.test.ts`
Expected: PASS (12개)

- [ ] **Step 5: `parseClaudeLine` 에 물린다**

`parse.ts` 의 유니온과 분기에 status 를 더한다. 계기는 대화 이벤트와 **함께** 나올 수 있다(`assistant` 한 줄이 headline 과 context 를 동시에 낸다). 그래서 분기를 가로채지 않고 결과를 합친다:

```ts
import { fromStatusLine } from './status'
import type { StatusEvent } from './status'

export type ClaudeTurnEvent = TurnEvent | ChildTurnEvent | PermissionEvent | StatusEvent

export function parseClaudeLine(line: string): ClaudeTurnEvent[] {
  // …기존 JSON.parse 부분 그대로…
  // 계기는 대화와 같은 줄에서 나온다 (assistant 한 줄이 말과 usage 를 함께 실어 온다)
  const status = fromStatusLine(event)
  return [...status, ...turns(event, parent)]
}
```

`turns(event, parent)` 는 기존 분기를 그대로 옮긴 내부 함수다 (`assistant`/`user`/`result`/`control_request`/`task_notification`).

- [ ] **Step 6: 기존 파서 테스트가 여전히 통과하는지 본다**

Run: `npm test -- src/entities/agent-session/api/claude/`
Expected: PASS. 기존 `parse.test.ts` 가 `toEqual([...])` 로 배열 전체를 비교하는 케이스가 있다면 계기 이벤트가 앞에 붙어 깨진다 — 그 경우 **테스트를 지우지 말고** 기대 배열에 계기 이벤트를 추가한다 (파서가 이제 더 많이 말하는 것이 맞다). `assistant`/`result` 를 다루는 케이스만 해당한다.

- [ ] **Step 7: 배럴에 내보내고 타입검사**

`src/entities/agent-session/index.ts` 에 추가:

```ts
export { fromStatusLine } from './api/claude/status'
export type {
  Counts, McpServer, RateLimit, ResultMetrics, SessionIdentity, StatusEvent,
} from './api/claude/status'
```

Run: `npm run typecheck && npm test`
Expected: PASS

- [ ] **Step 8: 커밋**

```bash
git add src/entities/agent-session/
git commit -m "feat: 계기의 층 파서 — init·usage·result·rate_limit·hook·compact

실측 근거를 테스트에 그대로 박았다: 컨텍스트는 assistant.usage 합이고
(다음 턴 cache_read 와 일치), 비용은 세션 누적, resetsAt 은 epoch 초다."
```

---

### Task 4: `statusStore` — 마지막으로 알려진 진실 하나

**Files:**
- Create: `src/entities/agent-session/model/status-store.ts`
- Create: `src/entities/agent-session/model/status-store.test.ts`
- Modify: `src/entities/agent-session/index.ts`

**Interfaces:**
- Consumes: `StatusEvent`, `SessionIdentity`, `RateLimit` (Task 3)
- Produces:
```ts
export type HookRun = { name: string; event: string; exitCode: number; ms: number }
export type UpdateInfo = { current: string | null; latest: string | null; managedBy: string | null }
export type StatusState = {
  session: SessionIdentity | null
  context: { used: number; window: number | null }
  cost: { usd: number; lastTurnUsd: number; tokens: {in,out,cacheRead,cacheCreate}; durationMs: number; ttftMs: number | null; turns: number }
  limit: RateLimit | null
  hooks: HookRun[]
  update: UpdateInfo | null
  activity: 'requesting' | 'idle'
}
export const statusStore: {
  get(): StatusState
  subscribe(listener: () => void): () => void
  apply(event: StatusEvent): void
  setUpdate(update: UpdateInfo): void
  reset(): void
}
```

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { statusStore } from './status-store'

beforeEach(() => {
  statusStore.reset()
})

const session = {
  id: 's1', cwd: '/w', model: 'claude-opus-5[1m]', permissionMode: 'acceptEdits',
  outputStyle: 'default', cliVersion: '2.1.231', apiKeySource: 'none',
  fastMode: { state: 'off', reason: 'sdk_opt_in_required' },
  mcp: [{ name: 'playwright', status: 'connected' }],
  counts: { tools: 3, commands: 2, agents: 1, skills: 1, plugins: 1 },
  memoryPaths: [],
}

function metrics(costUsd: number, contextWindow: number | null = 1_000_000) {
  return {
    costUsd,
    tokens: { in: 6, out: 261, cacheRead: 76424, cacheCreate: 14862 },
    durationMs: 10485, ttftMs: 2352, turns: 3,
    contextWindow, apiErrorStatus: null, stopReason: 'end_turn',
  }
}

describe('statusStore — 마지막으로 알려진 진실', () => {
  it('아무 말도 못 들었으면 모른다고 한다 — 화면이 지어내지 못하게', () => {
    const state = statusStore.get()
    expect(state.session).toBeNull()
    expect(state.limit).toBeNull()
    expect(state.update).toBeNull()
    expect(state.context).toEqual({ used: 0, window: null })
  })

  it('init 이 신원을 채운다', () => {
    statusStore.apply({ type: 'session', session })
    expect(statusStore.get().session?.cliVersion).toBe('2.1.231')
  })

  it('컨텍스트는 마지막 값으로 덮어쓴다 — 누적이 아니라 현재 크기다', () => {
    statusStore.apply({ type: 'context', used: 28364 })
    statusStore.apply({ type: 'context', used: 31059 })
    expect(statusStore.get().context.used).toBe(31059)
  })

  it('분모는 result 가 준 뒤에야 생긴다', () => {
    statusStore.apply({ type: 'context', used: 28364 })
    expect(statusStore.get().context.window).toBeNull()
    statusStore.apply({ type: 'metrics', metrics: metrics(0.1) })
    expect(statusStore.get().context.window).toBe(1_000_000)
  })

  it('분모를 모르는 result 는 이미 알던 분모를 지우지 않는다', () => {
    statusStore.apply({ type: 'metrics', metrics: metrics(0.1, 1_000_000) })
    statusStore.apply({ type: 'metrics', metrics: metrics(0.2, null) })
    expect(statusStore.get().context.window).toBe(1_000_000)
  })

  it('비용은 세션 누적이고, 턴 차액을 따로 든다 (실측 0.125331 → 0.166547)', () => {
    statusStore.apply({ type: 'metrics', metrics: metrics(0.125331) })
    expect(statusStore.get().cost.usd).toBeCloseTo(0.125331, 6)
    expect(statusStore.get().cost.lastTurnUsd).toBeCloseTo(0.125331, 6)

    statusStore.apply({ type: 'metrics', metrics: metrics(0.166547) })
    expect(statusStore.get().cost.usd).toBeCloseTo(0.166547, 6)
    expect(statusStore.get().cost.lastTurnUsd).toBeCloseTo(0.041216, 6)
  })

  it('한도는 마지막 경고를 든다', () => {
    statusStore.apply({
      type: 'limit',
      limit: { kind: 'seven_day', utilization: 0.28, resetsAtMs: 1787173200000, overage: false, status: 'allowed_warning' },
    })
    expect(statusStore.get().limit?.utilization).toBe(0.28)
  })

  it('훅의 시작과 끝을 hook_id 로 이어붙인다', () => {
    statusStore.apply({ type: 'hookStarted', hookId: 'c3d7', name: 'SessionStart:startup', event: 'SessionStart' })
    expect(statusStore.get().hooks).toHaveLength(0) // 끝나기 전에는 목록에 서지 않는다
    statusStore.apply({ type: 'hookDone', hookId: 'c3d7', exitCode: 0, stderr: '' })
    const [hook] = statusStore.get().hooks
    expect(hook).toMatchObject({ name: 'SessionStart:startup', event: 'SessionStart', exitCode: 0 })
    expect(typeof hook!.ms).toBe('number')
  })

  it('짝 없는 hookDone 은 버린다 — 이름 없는 줄을 화면에 세우지 않는다', () => {
    statusStore.apply({ type: 'hookDone', hookId: '없음', exitCode: 1, stderr: 'x' })
    expect(statusStore.get().hooks).toEqual([])
  })

  it('훅은 최근 다섯 개만 든다 — 서랍이 훅 로그가 되면 안 된다', () => {
    for (let i = 0; i < 7; i += 1) {
      statusStore.apply({ type: 'hookStarted', hookId: `h${i}`, name: `훅${i}`, event: 'PreToolUse' })
      statusStore.apply({ type: 'hookDone', hookId: `h${i}`, exitCode: 0, stderr: '' })
    }
    const hooks = statusStore.get().hooks
    expect(hooks).toHaveLength(5)
    expect(hooks[0]!.name).toBe('훅6') // 최신이 앞
  })

  it('진행 상태를 든다', () => {
    statusStore.apply({ type: 'activity', activity: 'requesting' })
    expect(statusStore.get().activity).toBe('requesting')
  })

  it('업데이트 정보는 CLI 가 아니라 우리가 넣는다', () => {
    statusStore.setUpdate({ current: '2.1.231', latest: '2.1.240', managedBy: 'Homebrew' })
    expect(statusStore.get().update).toEqual({ current: '2.1.231', latest: '2.1.240', managedBy: 'Homebrew' })
  })

  it('구독자에게 알리고, 변화가 없으면 알리지 않는다', () => {
    let count = 0
    const stop = statusStore.subscribe(() => { count += 1 })
    statusStore.apply({ type: 'activity', activity: 'requesting' })
    expect(count).toBe(1)
    statusStore.apply({ type: 'activity', activity: 'requesting' })
    expect(count).toBe(1) // 같은 값은 새 상태가 아니다
    stop()
    statusStore.apply({ type: 'activity', activity: 'idle' })
    expect(count).toBe(1)
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test -- src/entities/agent-session/model/status-store.test.ts`
Expected: FAIL — `Failed to resolve import "./status-store"`

- [ ] **Step 3: `status-store.ts` 를 쓴다**

`conversation.ts` 의 스토어 관용구(모듈 지역 상태 + `Set<Listener>` + `emit`)를 그대로 따른다. React 를 모른다 — `useSyncExternalStore` 가 이 형태를 먹는다.

```ts
import type { RateLimit, SessionIdentity, StatusEvent } from '../api/claude/status'

/**
 * 상태의 층이 드는 마지막 진실 하나. conversation 의 형제다 —
 * 지속하는 값은 여기, 일어난 사건은 대화로 간다. 그래야 나중에 올려보면
 * 그 일이 언제 일어났는지 보인다.
 *
 * null 은 "아직 모른다" 다. 모르는 것을 기본값으로 채우면 화면이 거짓말한다.
 */
export type HookRun = { name: string; event: string; exitCode: number; ms: number }

export type UpdateInfo = {
  current: string | null
  latest: string | null
  /** 'Homebrew' | 'npm' | null — 갱신을 어디에 부탁해야 하는지 */
  managedBy: string | null
}

export type StatusState = {
  session: SessionIdentity | null
  context: { used: number; window: number | null }
  cost: {
    /** 세션 누적 */
    usd: number
    /** 마지막 턴의 차액 — 대화의 턴 끝 줄이 쓴다 */
    lastTurnUsd: number
    tokens: { in: number; out: number; cacheRead: number; cacheCreate: number }
    durationMs: number
    ttftMs: number | null
    turns: number
  }
  limit: RateLimit | null
  hooks: HookRun[]
  update: UpdateInfo | null
  activity: 'requesting' | 'idle'
}

/** 서랍은 훅 로그가 아니다 — 최근 것만 든다 */
const HOOK_KEEP = 5

const EMPTY: StatusState = {
  session: null,
  context: { used: 0, window: null },
  cost: {
    usd: 0,
    lastTurnUsd: 0,
    tokens: { in: 0, out: 0, cacheRead: 0, cacheCreate: 0 },
    durationMs: 0,
    ttftMs: null,
    turns: 0,
  },
  limit: null,
  hooks: [],
  update: null,
  activity: 'idle',
}

type Listener = () => void

let state: StatusState = EMPTY
/** 시작만 알려진 훅들. 끝이 와야 목록에 선다 (이름과 걸린 시간이 함께 있어야 읽힌다) */
let pending = new Map<string, { name: string; event: string; startedAtMs: number }>()
const listeners = new Set<Listener>()

function emit(next: StatusState): void {
  state = next
  for (const listener of listeners) listener()
}

export const statusStore = {
  get(): StatusState {
    return state
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  apply(event: StatusEvent): void {
    if (event.type === 'session') {
      emit({ ...state, session: event.session })
      return
    }
    if (event.type === 'context') {
      // 컨텍스트는 누적이 아니라 현재 크기다 — 덮어쓴다
      emit({ ...state, context: { ...state.context, used: event.used } })
      return
    }
    if (event.type === 'metrics') {
      const m = event.metrics
      emit({
        ...state,
        // 분모를 모르는 result 가 이미 알던 분모를 지우면 % 가 사라진다
        context: { ...state.context, window: m.contextWindow ?? state.context.window },
        cost: {
          usd: m.costUsd,
          lastTurnUsd: Math.max(0, m.costUsd - state.cost.usd),
          tokens: m.tokens,
          durationMs: m.durationMs,
          ttftMs: m.ttftMs,
          turns: m.turns,
        },
      })
      return
    }
    if (event.type === 'limit') {
      emit({ ...state, limit: event.limit })
      return
    }
    if (event.type === 'hookStarted') {
      pending.set(event.hookId, { name: event.name, event: event.event, startedAtMs: Date.now() })
      return
    }
    if (event.type === 'hookDone') {
      const started = pending.get(event.hookId)
      if (!started) return // 이름을 모르는 훅은 화면에 세울 수 없다
      pending.delete(event.hookId)
      const run: HookRun = {
        name: started.name,
        event: started.event,
        exitCode: event.exitCode,
        ms: Date.now() - started.startedAtMs,
      }
      emit({ ...state, hooks: [run, ...state.hooks].slice(0, HOOK_KEEP) })
      return
    }
    if (event.type === 'activity') {
      if (state.activity === event.activity) return
      emit({ ...state, activity: event.activity })
      return
    }
    // compacted 는 사건이라 대화로 간다 (use-agent). 상태의 층에는 남길 것이 없다
  },
  setUpdate(update: UpdateInfo): void {
    emit({ ...state, update })
  },
  reset(): void {
    pending = new Map()
    emit(EMPTY)
  },
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npm test -- src/entities/agent-session/model/status-store.test.ts && npm run typecheck`
Expected: PASS (13개)

- [ ] **Step 5: 배럴에 내보낸다**

```ts
export { statusStore } from './model/status-store'
export type { HookRun, StatusState, UpdateInfo } from './model/status-store'
```

- [ ] **Step 6: 커밋**

```bash
git add src/entities/agent-session/
git commit -m "feat: statusStore — 상태의 층이 드는 마지막 진실 하나

null 은 아직 모른다는 뜻이고 화면은 모르는 칸을 그리지 않는다.
비용 차액·훅 짝짓기·분모 보존 규칙을 테스트가 지킨다."
```

---

### Task 5: 사건은 대화로 — `system` 차례와 배선

한도 경고·압축·API 오류·턴 결산은 상태가 아니라 **일어난 일**이다. 대화에 한 줄로 남아야 나중에 올려보면 언제 일어났는지 보인다.

**Files:**
- Modify: `src/pages/workspace/model/conversation.ts` (`system` 역할 추가)
- Modify: `src/pages/workspace/model/conversation.test.ts` (테스트 추가)
- Modify: `src/pages/workspace/model/use-agent.ts` (statusStore 배선 + 사건 줄)
- Modify: `src/widgets/conversation/ui/ConversationPane.tsx` (`system` 차례 렌더)

**Interfaces:**
- Consumes: `statusStore.apply` (Task 4), `StatusEvent` (Task 3)
- Produces: `conversation.system(text: string): void`, `Turn.role` 에 `'system'` 추가, `useAgent` 반환값에 `status: StatusState` 추가

- [ ] **Step 1: 실패하는 테스트를 쓴다** (`conversation.test.ts` 에 추가)

```ts
  it('사건은 자기 차례로 선다 — 말에 섞이지 않는다', () => {
    conversation.say('assistant', '고치고 있습니다')
    conversation.system('7일 한도 28% 사용 — 금 05:00 초기화')
    conversation.say('assistant', '고쳤습니다')

    const turns = conversation.get().turns
    expect(turns.map((turn) => turn.role)).toEqual(['assistant', 'system', 'assistant'])
    expect(turns[1]!.text).toBe('7일 한도 28% 사용 — 금 05:00 초기화')
  })

  it('사건 뒤의 말은 사건에 붙지 않는다', () => {
    conversation.system('여기서 대화가 압축됐습니다')
    conversation.system('두 번째 사건')
    // 사건은 각각 한 줄이다 — 문단으로 합치면 시간 순서가 뭉개진다
    expect(conversation.get().turns).toHaveLength(2)
  })
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test -- src/pages/workspace/model/conversation.test.ts`
Expected: FAIL — `conversation.system is not a function`

- [ ] **Step 3: `conversation.ts` 에 `system` 을 더한다**

`Turn['role']` 을 `'user' | 'assistant' | 'system'` 으로 넓히고, `appendable` 이 `system` 을 절대 합치지 않게 한다:

```ts
/** 마지막 차례가 이 역할의 것이고 아직 도구를 쓰지 않았으면 거기에 이어 붙인다 */
function appendable(role: Turn['role']): Turn | null {
  // 사건은 각각 한 줄이다 — 합치면 시간 순서가 뭉개진다
  if (role === 'system') return null
  const last = state.turns.at(-1)
  if (!last || last.role !== role) return null
  return last.tools.length === 0 ? last : null
}
```

`system` 메서드:

```ts
  /**
   * 일어난 일 한 줄 — 한도 경고, 압축, API 오류, 턴 결산.
   * 상태줄이 드는 "지금 값" 과 달리 이것은 시간 위의 점이라 대화에 남아야 한다.
   */
  system(text: string): void {
    emit({
      ...state,
      turns: [...state.turns, { role: 'system', text, tools: [], startedAtMs: Date.now() }],
    })
  },
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npm test -- src/pages/workspace/model/conversation.test.ts`
Expected: PASS

- [ ] **Step 5: `use-agent.ts` 를 배선한다**

파서가 이제 계기 이벤트도 내므로, 루프에 상태의 층을 더한다. 사건 문장은 여기서 만든다 (스토어는 문장을 모른다 — 화면의 말투는 화면의 일이다):

```ts
import { statusStore } from '@/entities/agent-session'
import type { StatusState } from '@/entities/agent-session'

// …useAgent 안…
const status = useSyncExternalStore(statusStore.subscribe, statusStore.get, statusStore.get)

// …이벤트 루프 안, 기존 turn.type 분기와 나란히…
if (
  turn.type === 'session' || turn.type === 'context' || turn.type === 'metrics' ||
  turn.type === 'limit' || turn.type === 'hookStarted' || turn.type === 'hookDone' ||
  turn.type === 'activity' || turn.type === 'compacted'
) {
  statusStore.apply(turn)
}

// 사건은 대화에도 남는다
if (turn.type === 'limit' && turn.limit.status !== 'allowed') {
  conversation.system(limitLine(turn.limit))
}
if (turn.type === 'compacted') {
  conversation.system('여기서 대화가 압축됐습니다 — 앞의 내용은 요약으로 남습니다')
}
if (turn.type === 'metrics') {
  if (turn.metrics.apiErrorStatus) {
    conversation.system(`API 오류 ${turn.metrics.apiErrorStatus}`)
  }
  conversation.system(turnLine(turn.metrics, statusStore.get().cost.lastTurnUsd))
}
```

두 문장 만드는 함수는 파일 아래에 둔다 (`statusStore.apply` 를 먼저 부른 뒤 `lastTurnUsd` 를 읽는 순서가 중요하다 — 차액은 적용 후에 계산된다):

```ts
/** 한도는 사실만 말한다 — 겁주지 않고, 손쓸 수 있는 값(초기화 시각)을 함께 준다 */
function limitLine(limit: RateLimit): string {
  const percent = Math.round(limit.utilization * 100)
  const when = new Date(limit.resetsAtMs).toLocaleString('ko-KR', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const overage = limit.overage ? ' · 초과분 사용 중' : ''
  return `${limitKindLabel(limit.kind)} 한도 ${percent}% 사용 — ${when} 초기화${overage}`
}

function limitKindLabel(kind: string): string {
  if (kind === 'seven_day') return '7일'
  if (kind === 'five_hour') return '5시간'
  return kind
}

/** 턴 결산 — 비용은 세션 누적이라 차액을 쓴다 (실측 근거: 스펙 §실측 1) */
function turnLine(metrics: ResultMetrics, turnUsd: number): string {
  const seconds = (metrics.durationMs / 1000).toFixed(1)
  const cost = turnUsd > 0 ? ` · $${turnUsd.toFixed(4)}` : ''
  return `이 턴 ${metrics.tokens.out.toLocaleString('ko-KR')}출력 · ${seconds}초${cost}`
}
```

`Agent` 타입에 `status: StatusState` 를 더하고 반환값에 넣는다. `statusStore` 는 프로세스가 죽어도(`exit`) 마지막 값을 들고 있어야 한다 — 세션이 끝났다고 계기를 지우면 방금 쓴 비용을 볼 수 없다. **`exit` 에서 리셋하지 않는다.**

- [ ] **Step 6: `ConversationPane` 이 `system` 차례를 그린다**

`turns.map` 안, `user` 분기 앞에:

```tsx
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
```

`live` 판정이 `turn.role === 'assistant'` 를 이미 보므로 사건 줄에 레일이 붙지 않는다.

- [ ] **Step 7: 전체 테스트와 타입검사**

Run: `npm test && npm run typecheck`
Expected: PASS

- [ ] **Step 8: 커밋**

```bash
git add src/pages/workspace/ src/widgets/conversation/
git commit -m "feat: 사건은 대화로 — 한도 경고·압축·API 오류·턴 결산

지속하는 값은 statusStore, 일어난 일은 system 차례. 그래야 나중에
올려보면 그 일이 언제 일어났는지 보인다."
```

---

### Task 6: 상태줄 — 상시 보이는 한 줄

**Files:**
- Create: `src/widgets/status-bar/ui/StatusBar.tsx`
- Create: `src/widgets/status-bar/ui/StatusBar.test.tsx`
- Create: `src/widgets/status-bar/lib/format.ts`
- Create: `src/widgets/status-bar/lib/format.test.ts`
- Create: `src/widgets/status-bar/index.ts`
- Modify: `src/widgets/conversation/ui/ConversationPane.tsx` (작성창 아래에 세운다)

**Interfaces:**
- Consumes: `StatusState` (Task 4)
- Produces:
  - `format.ts` → `export function contextPercent(context: {used:number; window:number|null}): number | null`, `export function cells(status: StatusState): Cell[]`, `export type Cell = { key: string; text: string; warn: boolean }`
  - `StatusBar.tsx` → `export function StatusBar({ status, open, onToggle }: { status: StatusState; open: boolean; onToggle(): void })`

- [ ] **Step 1: 칸 만들기 함수의 실패하는 테스트를 쓴다**

```ts
import { describe, expect, it } from 'vitest'
import { cells, contextPercent } from './format'
import type { StatusState } from '@/entities/agent-session'

function state(overrides: Partial<StatusState> = {}): StatusState {
  return {
    session: null,
    context: { used: 0, window: null },
    cost: { usd: 0, lastTurnUsd: 0, tokens: { in: 0, out: 0, cacheRead: 0, cacheCreate: 0 }, durationMs: 0, ttftMs: null, turns: 0 },
    limit: null,
    hooks: [],
    update: null,
    activity: 'idle',
    ...overrides,
  }
}

describe('상태줄의 칸', () => {
  it('아무것도 모르면 칸이 하나도 없다 — 빈 자리를 만들지 않는다', () => {
    expect(cells(state())).toEqual([])
  })

  it('분모를 모르면 % 대신 절대값을 쓴다', () => {
    expect(contextPercent({ used: 28364, window: null })).toBeNull()
    const [cell] = cells(state({ context: { used: 28364, window: null } }))
    expect(cell).toEqual({ key: 'context', text: '컨텍스트 28.4k', warn: false })
  })

  it('분모를 알면 남은 비율로 말한다 — 사람이 신경쓰는 것은 남은 쪽이다', () => {
    expect(contextPercent({ used: 100_000, window: 1_000_000 })).toBe(10)
    const [cell] = cells(state({ context: { used: 100_000, window: 1_000_000 } }))
    expect(cell).toEqual({ key: 'context', text: '컨텍스트 90%', warn: false })
  })

  it('85% 를 넘게 쓰면 그 칸이 문장으로 부푼다', () => {
    const [cell] = cells(state({ context: { used: 880_000, window: 1_000_000 } }))
    expect(cell!.warn).toBe(true)
    expect(cell!.text).toBe('컨텍스트 12% 남음 — 곧 압축됩니다')
  })

  it('비용은 세션 총액이다', () => {
    const found = cells(state({ cost: { ...state().cost, usd: 0.19338 } })).find((c) => c.key === 'cost')
    expect(found).toEqual({ key: 'cost', text: '$0.19', warn: false })
  })

  it('한도는 경고 상태에서만 부푼다', () => {
    const calm = cells(state({ limit: { kind: 'seven_day', utilization: 0.28, resetsAtMs: 1787173200000, overage: false, status: 'allowed' } }))
    expect(calm.find((c) => c.key === 'limit')).toEqual({ key: 'limit', text: '7일 28%', warn: false })

    const warned = cells(state({ limit: { kind: 'seven_day', utilization: 0.28, resetsAtMs: 1787173200000, overage: false, status: 'allowed_warning' } }))
    expect(warned.find((c) => c.key === 'limit')!.warn).toBe(true)
  })

  it('MCP 는 연결된 수를 세고, 인증이 필요한 것이 있으면 부푼다', () => {
    const session = {
      id: 's', cwd: '/w', model: 'm', permissionMode: 'ask', outputStyle: 'default',
      cliVersion: '2.1.231', apiKeySource: 'none', fastMode: { state: 'off', reason: null },
      counts: { tools: 0, commands: 0, agents: 0, skills: 0, plugins: 0 }, memoryPaths: [],
      mcp: [
        { name: 'a', status: 'connected' }, { name: 'b', status: 'connected' },
        { name: 'c', status: 'needs-auth' }, { name: 'd', status: 'pending' },
      ],
    }
    const found = cells(state({ session })).find((c) => c.key === 'mcp')
    expect(found).toEqual({ key: 'mcp', text: 'MCP 2/4 · 1개 인증 필요', warn: true })
  })

  it('MCP 가 하나도 없으면 칸을 만들지 않는다', () => {
    const session = { ...state().session, mcp: [] }
    expect(cells(state({ session: session as never })).find((c) => c.key === 'mcp')).toBeUndefined()
  })

  it('새 버전이 있으면 버전 칸이 부푼다', () => {
    const calm = cells(state({ update: { current: '2.1.231', latest: '2.1.231', managedBy: 'Homebrew' } }))
    expect(calm.find((c) => c.key === 'update')).toEqual({ key: 'update', text: '2.1.231', warn: false })

    const stale = cells(state({ update: { current: '2.1.231', latest: '2.1.240', managedBy: 'Homebrew' } }))
    expect(stale.find((c) => c.key === 'update')).toEqual({
      key: 'update', text: '새 버전 2.1.240 있음', warn: true,
    })
  })

  it('칸의 순서는 고정이다 — 값이 채워질 때 줄이 흔들리면 안 된다', () => {
    const full = cells(state({
      context: { used: 100_000, window: 1_000_000 },
      cost: { ...state().cost, usd: 0.19 },
      limit: { kind: 'seven_day', utilization: 0.28, resetsAtMs: 0, overage: false, status: 'allowed' },
      update: { current: '2.1.231', latest: '2.1.231', managedBy: null },
    }))
    expect(full.map((c) => c.key)).toEqual(['context', 'cost', 'limit', 'update'])
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test -- src/widgets/status-bar/lib/format.test.ts`
Expected: FAIL — `Failed to resolve import "./format"`

- [ ] **Step 3: `format.ts` 를 쓴다**

```ts
import type { StatusState } from '@/entities/agent-session'

/**
 * 상태줄의 칸을 만든다 — 순수 함수라 화면 없이 테스트된다.
 *
 * 두 규칙이 전부다: ① 모르는 값은 칸을 만들지 않는다 (빈 자리를 두면 줄이 흔들린다)
 * ② 경고는 색이 아니라 문장으로 말한다 (warn: true 인 칸만 어절이 길어진다).
 */
export type Cell = { key: string; text: string; warn: boolean }

/** 컨텍스트가 이 비율을 넘게 차면 압축이 임박이다 — 사람이 손쓸 수 있는 마지막 지점 */
const CONTEXT_WARN = 0.85

export function contextPercent(context: { used: number; window: number | null }): number | null {
  if (!context.window || context.window <= 0) return null
  return Math.round((context.used / context.window) * 100)
}

function thousands(tokens: number): string {
  if (tokens < 1000) return String(tokens)
  return `${(tokens / 1000).toFixed(1)}k`
}

export function cells(status: StatusState): Cell[] {
  const out: Cell[] = []

  if (status.context.used > 0) {
    const percent = contextPercent(status.context)
    if (percent === null) {
      // 분모를 모르는 동안은 절대값만 — % 를 지어내지 않는다
      out.push({ key: 'context', text: `컨텍스트 ${thousands(status.context.used)}`, warn: false })
    } else if (percent >= CONTEXT_WARN * 100) {
      out.push({ key: 'context', text: `컨텍스트 ${100 - percent}% 남음 — 곧 압축됩니다`, warn: true })
    } else {
      out.push({ key: 'context', text: `컨텍스트 ${100 - percent}%`, warn: false })
    }
  }

  if (status.cost.usd > 0) {
    out.push({ key: 'cost', text: `$${status.cost.usd.toFixed(2)}`, warn: false })
  }

  const limit = status.limit
  if (limit) {
    const percent = Math.round(limit.utilization * 100)
    const warn = limit.status !== 'allowed' || limit.overage
    const when = new Date(limit.resetsAtMs).toLocaleString('ko-KR', {
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
    out.push({
      key: 'limit',
      text: warn
        ? `${limitLabel(limit.kind)} 한도 ${percent}% — ${when} 초기화`
        : `${limitLabel(limit.kind)} ${percent}%`,
      warn,
    })
  }

  const mcp = status.session?.mcp ?? []
  if (mcp.length > 0) {
    const connected = mcp.filter((server) => server.status === 'connected').length
    const needsAuth = mcp.filter((server) => server.status === 'needs-auth').length
    out.push({
      key: 'mcp',
      text: needsAuth > 0
        ? `MCP ${connected}/${mcp.length} · ${needsAuth}개 인증 필요`
        : `MCP ${connected}/${mcp.length}`,
      warn: needsAuth > 0,
    })
  }

  const update = status.update
  if (update?.current) {
    const stale = update.latest !== null && update.latest !== update.current
    out.push({
      key: 'update',
      text: stale ? `새 버전 ${update.latest} 있음` : update.current,
      warn: stale,
    })
  }

  return out
}

function limitLabel(kind: string): string {
  if (kind === 'seven_day') return '7일'
  if (kind === 'five_hour') return '5시간'
  return kind
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npm test -- src/widgets/status-bar/lib/format.test.ts`
Expected: PASS (10개)

- [ ] **Step 5: `StatusBar.tsx` 의 실패하는 테스트를 쓴다**

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { StatusState } from '@/entities/agent-session'
import { StatusBar } from './StatusBar'

function state(overrides: Partial<StatusState> = {}): StatusState {
  return {
    session: null,
    context: { used: 100_000, window: 1_000_000 },
    cost: { usd: 0.19, lastTurnUsd: 0.04, tokens: { in: 6, out: 261, cacheRead: 76424, cacheCreate: 14862 }, durationMs: 10485, ttftMs: 2352, turns: 3 },
    limit: null,
    hooks: [],
    update: { current: '2.1.231', latest: '2.1.231', managedBy: 'Homebrew' },
    activity: 'idle',
    ...overrides,
  }
}

describe('StatusBar', () => {
  it('아는 값만 칸으로 세운다', () => {
    const html = renderToStaticMarkup(<StatusBar status={state()} open={false} onToggle={() => {}} />)
    expect(html).toContain('컨텍스트 90%')
    expect(html).toContain('$0.19')
    expect(html).toContain('2.1.231')
  })

  it('아무것도 모르면 손잡이만 남는다 — 빈 줄이 자리를 차지하지 않게', () => {
    const empty = state({ context: { used: 0, window: null }, cost: { ...state().cost, usd: 0 }, update: null })
    const html = renderToStaticMarkup(<StatusBar status={empty} open={false} onToggle={() => {}} />)
    expect(html).not.toContain('컨텍스트')
    expect(html).toContain('aria-expanded="false"')
  })

  it('숫자는 tabular-nums 로 선다 — 값이 바뀔 때 자리가 흔들리면 안 된다', () => {
    const html = renderToStaticMarkup(<StatusBar status={state()} open={false} onToggle={() => {}} />)
    expect(html).toContain('tabular-nums')
  })

  it('경고 칸은 색이 아니라 선 굵기로 말한다', () => {
    const warned = state({
      limit: { kind: 'seven_day', utilization: 0.28, resetsAtMs: 1787173200000, overage: false, status: 'allowed_warning' },
    })
    const html = renderToStaticMarkup(<StatusBar status={warned} open={false} onToggle={() => {}} />)
    expect(html).toContain('한도 28%')
    // 색 이름이 마크업에 들어오면 §4.2 위반이다
    expect(html).not.toMatch(/text-(red|amber|yellow|orange)-/)
  })

  it('열려 있으면 손잡이가 그것을 말한다', () => {
    const html = renderToStaticMarkup(<StatusBar status={state()} open onToggle={() => {}} />)
    expect(html).toContain('aria-expanded="true"')
  })
})
```

- [ ] **Step 6: 실패를 확인한다**

Run: `npm test -- src/widgets/status-bar/ui/StatusBar.test.tsx`
Expected: FAIL — `Failed to resolve import "./StatusBar"`

- [ ] **Step 7: `StatusBar.tsx` 를 쓴다**

```tsx
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { StatusState } from '@/entities/agent-session'
import { cn } from '@/shared/lib/cn'
import { cells } from '../lib/format'

/**
 * 상시 보이는 한 줄 — TUI 의 상태줄 자리다.
 *
 * 규칙 셋: ① 모르는 칸은 아예 없다 (자리를 비워두면 값이 채워질 때 줄이 흔들린다)
 * ② 경고는 색이 아니라 문장과 선 굵기 (§4.2 — 글자는 100% currentColor)
 * ③ 숫자는 tabular-nums.
 */
type StatusBarProps = {
  status: StatusState
  open: boolean
  onToggle(): void
}

export function StatusBar({ status, open, onToggle }: StatusBarProps) {
  const items = cells(status)

  return (
    <div className="flex flex-none items-center gap-2.5 border-t border-current/10 pt-2">
      <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
        {items.map((cell) => (
          <span
            key={cell.key}
            className={cn(
              'flex-none truncate font-mono text-[10.5px] tracking-wide tabular-nums',
              // 경고는 어절이 길어지고 선이 생긴다 — 색은 들이지 않는다
              cell.warn
                ? 'rounded-full border border-current/40 px-1.5 py-px opacity-100'
                : 'opacity-60',
            )}
          >
            {cell.text}
          </span>
        ))}
      </div>
      {/* 손잡이는 늘 오른쪽 같은 자리다 — 칸이 늘어도 눈이 다시 찾지 않게 */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label="세션 명세"
        className="zt-btn zt-btn--ghost zt-btn--sm flex-none"
      >
        {open ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
      </button>
    </div>
  )
}
```

`index.ts`:

```ts
export { StatusBar } from './ui/StatusBar'
export { cells, contextPercent } from './lib/format'
export type { Cell } from './lib/format'
```

- [ ] **Step 8: 통과를 확인한다**

Run: `npm test -- src/widgets/status-bar/`
Expected: PASS

- [ ] **Step 9: `ConversationPane` 에 세운다**

`ConversationPaneProps` 에 `status: StatusState` 를 더하고, `useState` 로 `drawerOpen` 을 든다. 반환 JSX 의 맨 아래(작성창/권한 카드 **아래**)에:

```tsx
      <StatusBar status={status} open={drawerOpen} onToggle={() => setDrawerOpen((was) => !was)} />
```

첫 화면(`turns.length === 0`) 분기에도 같이 넣는다 — 처음 켠 사람도 무엇이 준비됐는지 봐야 한다. `WorkspaceScreen.tsx` 에서 `status={agent.status}` 를 넘긴다 (`useAgent` 가 Task 5 에서 이미 낸다).

- [ ] **Step 10: 전체 테스트·타입검사·커밋**

Run: `npm test && npm run typecheck`
Expected: PASS

```bash
git add src/widgets/status-bar/ src/widgets/conversation/ src/pages/workspace/
git commit -m "feat: 상태줄 — 컨텍스트·비용·한도·MCP·버전을 상시 한 줄로

모르는 칸은 만들지 않고, 경고는 색이 아니라 어절과 선으로 말한다."
```

---

### Task 7: 서랍 — 네 묶음의 전체 명세

**Files:**
- Create: `src/widgets/status-bar/ui/StatusDrawer.tsx`
- Create: `src/widgets/status-bar/ui/StatusDrawer.test.tsx`
- Modify: `src/widgets/status-bar/index.ts`
- Modify: `src/widgets/conversation/ui/ConversationPane.tsx`

**Interfaces:**
- Consumes: `StatusState` (Task 4)
- Produces: `export function StatusDrawer({ status, onUpdate, updating }: { status: StatusState; onUpdate(): void; updating: boolean })`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { StatusState } from '@/entities/agent-session'
import { StatusDrawer } from './StatusDrawer'

const full: StatusState = {
  session: {
    id: 'f77f771b-4d45-4551-b887-202b62a6edc5',
    cwd: '/Users/sam/workspace/zetrem',
    model: 'claude-opus-5[1m]',
    permissionMode: 'acceptEdits',
    outputStyle: 'default',
    cliVersion: '2.1.231',
    apiKeySource: 'none',
    fastMode: { state: 'off', reason: 'sdk_opt_in_required' },
    mcp: [
      { name: 'playwright', status: 'connected' },
      { name: 'claude.ai Notion', status: 'needs-auth' },
    ],
    counts: { tools: 62, commands: 65, agents: 12, skills: 20, plugins: 3 },
    memoryPaths: ['/Users/sam/.claude/projects/x/memory/'],
  },
  context: { used: 100_000, window: 1_000_000 },
  cost: { usd: 0.19, lastTurnUsd: 0.04, tokens: { in: 6, out: 261, cacheRead: 76424, cacheCreate: 14862 }, durationMs: 10485, ttftMs: 2352, turns: 3 },
  limit: null,
  hooks: [{ name: 'SessionStart:startup', event: 'SessionStart', exitCode: 0, ms: 12 }],
  update: { current: '2.1.231', latest: '2.1.231', managedBy: 'Homebrew' },
  activity: 'idle',
}

describe('StatusDrawer', () => {
  it('세션 묶음이 신원을 전부 말한다', () => {
    const html = renderToStaticMarkup(<StatusDrawer status={full} onUpdate={() => {}} updating={false} />)
    expect(html).toContain('f77f771b')
    expect(html).toContain('/Users/sam/workspace/zetrem')
    expect(html).toContain('claude-opus-5[1m]')
    expect(html).toContain('sdk_opt_in_required') // 빠른 모드가 꺼진 이유
  })

  it('계기 묶음이 토큰 네 종류와 컨텍스트·비용을 나눠 보인다', () => {
    const html = renderToStaticMarkup(<StatusDrawer status={full} onUpdate={() => {}} updating={false} />)
    expect(html).toContain('76,424') // 캐시 읽기
    expect(html).toContain('14,862') // 캐시 생성
    expect(html).toContain('261')    // 출력
    expect(html).toContain('100,000')
  })

  it('MCP 는 전부 줄로 서고 인증이 필요한 것이 드러난다', () => {
    const html = renderToStaticMarkup(<StatusDrawer status={full} onUpdate={() => {}} updating={false} />)
    expect(html).toContain('playwright')
    expect(html).toContain('claude.ai Notion')
    expect(html).toContain('인증 필요')
  })

  it('환경 묶음이 버전과 관리 주체를 말한다', () => {
    const html = renderToStaticMarkup(<StatusDrawer status={full} onUpdate={() => {}} updating={false} />)
    expect(html).toContain('2.1.231')
    expect(html).toContain('Homebrew')
    expect(html).toContain('SessionStart:startup')
  })

  it('새 버전이 있을 때만 갱신 버튼이 선다', () => {
    const calm = renderToStaticMarkup(<StatusDrawer status={full} onUpdate={() => {}} updating={false} />)
    expect(calm).not.toContain('갱신하기')

    const stale = { ...full, update: { current: '2.1.231', latest: '2.1.240', managedBy: 'Homebrew' } }
    const html = renderToStaticMarkup(<StatusDrawer status={stale} onUpdate={() => {}} updating={false} />)
    expect(html).toContain('갱신하기')
  })

  it('아직 세션이 없으면 모르는 묶음은 그리지 않는다', () => {
    const bare: StatusState = { ...full, session: null, hooks: [], update: null }
    const html = renderToStaticMarkup(<StatusDrawer status={bare} onUpdate={() => {}} updating={false} />)
    expect(html).not.toContain('claude-opus-5')
    expect(html).not.toContain('SessionStart')
  })

  it('서랍은 40vh 를 넘지 않는다 — 대화의 자리를 빼앗지 않게', () => {
    const html = renderToStaticMarkup(<StatusDrawer status={full} onUpdate={() => {}} updating={false} />)
    expect(html).toContain('40vh')
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test -- src/widgets/status-bar/ui/StatusDrawer.test.tsx`
Expected: FAIL — `Failed to resolve import "./StatusDrawer"`

- [ ] **Step 3: `StatusDrawer.tsx` 를 쓴다**

네 묶음을 같은 `Row` 하나로 그린다 (라벨 + 값). 라벨은 고정폭 11px/60%, 값은 고정폭 11px/100% + `tabular-nums`.

```tsx
import type { ReactNode } from 'react'
import type { StatusState } from '@/entities/agent-session'
import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'

/**
 * 상태줄이 접어둔 전체 명세 — TUI 의 `/status` 와 `/mcp` 가 있던 자리다.
 *
 * 네 묶음(세션·계기·연결·환경)이 제목 없이 선다. 모르는 묶음은 그리지 않는다:
 * 빈 제목만 남은 묶음은 "정보가 없다" 가 아니라 "고장났다" 로 읽힌다.
 */
type StatusDrawerProps = {
  status: StatusState
  /** 사람이 갱신을 시작한다 — 앱이 알아서 설치하지 않는다 */
  onUpdate(): void
  updating: boolean
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span className="w-[92px] flex-none font-mono text-[11px] opacity-60">{label}</span>
      <span className="min-w-0 flex-1 font-mono text-[11px] tabular-nums [overflow-wrap:anywhere]">
        {children}
      </span>
    </div>
  )
}

function n(value: number): string {
  return value.toLocaleString('ko-KR')
}

export function StatusDrawer({ status, onUpdate, updating }: StatusDrawerProps) {
  const { session, context, cost, hooks, update } = status
  const stale = update?.latest != null && update.current != null && update.latest !== update.current

  return (
    <div className="zt-scroll zt-enter flex max-h-[40vh] flex-none flex-col gap-3 overflow-y-auto pt-2 pr-2">
      {session && (
        <div className="flex flex-col gap-1">
          <Row label="세션">{session.id.slice(0, 8)}</Row>
          <Row label="자리">{session.cwd}</Row>
          <Row label="모델">{session.model}</Row>
          <Row label="권한 모드">{session.permissionMode}</Row>
          <Row label="출력 스타일">{session.outputStyle}</Row>
          <Row label="빠른 모드">
            {session.fastMode.state}
            {session.fastMode.reason ? ` — ${session.fastMode.reason}` : ''}
          </Row>
          {session.apiKeySource !== 'none' && <Row label="API 키">{session.apiKeySource}</Row>}
        </div>
      )}

      {(cost.usd > 0 || context.used > 0) && (
        <>
          <Separator className="opacity-30" />
          <div className="flex flex-col gap-1">
            <Row label="컨텍스트">
              {n(context.used)}
              {context.window ? ` / ${n(context.window)}` : ' (분모 미확인)'}
            </Row>
            <Row label="토큰">
              캐시읽기 {n(cost.tokens.cacheRead)} · 캐시생성 {n(cost.tokens.cacheCreate)} · 입력{' '}
              {n(cost.tokens.in)} · 출력 {n(cost.tokens.out)}
            </Row>
            <Row label="비용">
              ${cost.usd.toFixed(4)}
              {cost.lastTurnUsd > 0 ? ` (이 턴 $${cost.lastTurnUsd.toFixed(4)})` : ''}
            </Row>
            <Row label="턴">{n(cost.turns)}</Row>
            <Row label="걸린 시간">
              {(cost.durationMs / 1000).toFixed(1)}초
              {cost.ttftMs != null ? ` · 첫 응답 ${(cost.ttftMs / 1000).toFixed(1)}초` : ''}
            </Row>
          </div>
        </>
      )}

      {session && session.mcp.length > 0 && (
        <>
          <Separator className="opacity-30" />
          <div className="flex flex-col gap-1">
            {session.mcp.map((server) => (
              <Row key={server.name} label={server.name}>
                {/* 인증이 필요한 줄은 색이 아니라 말로 드러난다 */}
                <span className={server.status === 'needs-auth' ? 'font-semibold' : 'opacity-70'}>
                  {mcpLabel(server.status)}
                </span>
              </Row>
            ))}
            <Row label="쓸 수 있는 것">
              도구 {n(session.counts.tools)} · 명령 {n(session.counts.commands)} · 에이전트{' '}
              {n(session.counts.agents)} · 스킬 {n(session.counts.skills)} · 플러그인{' '}
              {n(session.counts.plugins)}
            </Row>
          </div>
        </>
      )}

      {(update || hooks.length > 0 || session) && (
        <>
          <Separator className="opacity-30" />
          <div className="flex flex-col gap-1">
            {update?.current && (
              <Row label="CLI">
                <span className="flex flex-wrap items-center gap-2">
                  <span>
                    {update.current}
                    {update.latest === null
                      ? ' — 최신 여부 확인 못 함'
                      : stale
                        ? ` — 새 버전 ${update.latest}`
                        : ' — 최신'}
                    {update.managedBy ? ` (${update.managedBy})` : ''}
                  </span>
                  {stale && (
                    <Button size="sm" variant="outline" onClick={onUpdate} disabled={updating}>
                      {updating ? '갱신 중…' : '갱신하기'}
                    </Button>
                  )}
                </span>
              </Row>
            )}
            {session?.memoryPaths.map((path) => (
              <Row key={path} label="기억">
                {path}
              </Row>
            ))}
            {hooks.map((hook, index) => (
              <Row key={`${hook.name}-${index}`} label={index === 0 ? '훅' : ''}>
                {hook.name} · {hook.exitCode} · {hook.ms}ms
              </Row>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function mcpLabel(status: string): string {
  if (status === 'connected') return '연결됨'
  if (status === 'needs-auth') return '인증 필요'
  if (status === 'pending') return '연결 중'
  return status
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npm test -- src/widgets/status-bar/`
Expected: PASS

- [ ] **Step 5: `ConversationPane` 에서 상태줄 위에 붙인다**

`drawerOpen` 이 참일 때 `StatusBar` **위에** 그린다 (서랍이 아래에서 올라오는 물 문법: 상태줄이 밀려 올라가고 명세가 그 아래에서 오르는 것이 아니라, 명세가 상태줄 위 자리를 차지하고 상태줄은 늘 마지막 줄이다 — 손잡이가 움직이지 않는 쪽을 택한다).

```tsx
      {drawerOpen && (
        <StatusDrawer status={status} onUpdate={onUpdateCli} updating={updatingCli} />
      )}
      <StatusBar status={status} open={drawerOpen} onToggle={() => setDrawerOpen((was) => !was)} />
```

`onUpdateCli`/`updatingCli` 는 Task 8 에서 온다. 이 태스크에서는 `ConversationPaneProps` 에 두 prop 을 추가하고 `WorkspaceScreen` 이 `onUpdateCli={() => {}} updatingCli={false}` 를 넘겨 자리만 잡는다 — 다음 태스크가 그 선을 잇는다.

- [ ] **Step 6: 전체 테스트·타입검사·커밋**

Run: `npm test && npm run typecheck`
Expected: PASS

```bash
git add src/widgets/status-bar/ src/widgets/conversation/ src/pages/workspace/
git commit -m "feat: 상태 서랍 — 세션·계기·연결·환경 네 묶음

TUI 의 /status 와 /mcp 가 있던 자리. 모르는 묶음은 그리지 않는다."
```

---

### Task 8: 업데이트 — 읽기는 레지스트리, 설치는 사람

**Files:**
- Create: `src/entities/agent-session/model/cli-update.ts`
- Create: `src/entities/agent-session/model/cli-update.test.ts`
- Create: `electron/cli-version.ts`
- Modify: `electron/main.ts` (핸들러 등록)
- Modify: `electron/preload.ts`
- Modify: `src/shared/api/desk.ts`
- Modify: `src/entities/agent-session/index.ts`
- Modify: `src/pages/workspace/model/use-agent.ts` (또는 새 `use-cli-update.ts`)
- Modify: `src/pages/workspace/ui/WorkspaceScreen.tsx`

**Interfaces:**
- Consumes: `statusStore.setUpdate` (Task 4), `StatusDrawer` 의 `onUpdate`/`updating` (Task 7)
- Produces:
  - `cli-update.ts` → `export function isOutdated(current: string | null, latest: string | null): boolean`, `export function managerOf(binaryPath: string): string | null`
  - `desk.ts` → `latestCliVersion(): Promise<{ latest: string | null; managedBy: string | null }>`, `runCliUpdate(): Promise<{ output: string }>`
  - `use-cli-update.ts` → `export function useCliUpdate(cliVersion: string | null): { updating: boolean; start(): void }`

- [ ] **Step 1: 순수 함수의 실패하는 테스트를 쓴다**

```ts
import { describe, expect, it } from 'vitest'
import { isOutdated, managerOf } from './cli-update'

describe('버전 비교 — 의존성 없이', () => {
  it('뒤 버전이 크면 낡았다', () => {
    expect(isOutdated('2.1.231', '2.1.240')).toBe(true)
    expect(isOutdated('2.1.231', '2.2.0')).toBe(true)
    expect(isOutdated('1.9.99', '2.0.0')).toBe(true)
  })

  it('같거나 앞서면 낡지 않았다 (실측: 둘 다 2.1.231)', () => {
    expect(isOutdated('2.1.231', '2.1.231')).toBe(false)
    expect(isOutdated('2.2.0', '2.1.240')).toBe(false)
  })

  it('자릿수가 달라도 숫자로 비교한다 — 문자열 비교면 2.1.99 > 2.1.231 이 된다', () => {
    expect(isOutdated('2.1.99', '2.1.231')).toBe(true)
  })

  it('모르는 값에는 낡았다고 말하지 않는다 — 없는 경고를 띄우지 않는다', () => {
    expect(isOutdated(null, '2.1.240')).toBe(false)
    expect(isOutdated('2.1.231', null)).toBe(false)
    expect(isOutdated('알 수 없음', '2.1.240')).toBe(false)
  })

  it('설치 경로가 관리 주체를 말한다 — 갱신을 어디에 부탁할지가 달라진다', () => {
    expect(managerOf('/opt/homebrew/Caskroom/claude-code@latest/2.1.231/claude')).toBe('Homebrew')
    expect(managerOf('/Users/sam/.nvm/versions/node/v22.0.0/lib/node_modules/@anthropic-ai/claude-code/cli.js')).toBe('npm')
    expect(managerOf('/usr/local/bin/claude')).toBeNull()
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test -- src/entities/agent-session/model/cli-update.test.ts`
Expected: FAIL — `Failed to resolve import "./cli-update"`

- [ ] **Step 3: `cli-update.ts` 를 쓴다**

```ts
/**
 * CLI 버전에 대한 판단 — 순수 함수라 네트워크도 프로세스도 모른다.
 * 의존성을 늘리지 않기 위해 semver 비교를 직접 쓴다 (우리가 비교하는 것은
 * `2.1.231` 형태의 세 자리뿐이고, 프리릴리스는 이 채널에 오지 않는다).
 */
function triple(version: string): number[] | null {
  const parts = version.trim().split('.')
  if (parts.length < 2) return null
  const numbers = parts.slice(0, 3).map((part) => Number.parseInt(part, 10))
  return numbers.every((value) => Number.isInteger(value)) ? numbers : null
}

export function isOutdated(current: string | null, latest: string | null): boolean {
  if (!current || !latest) return false
  const a = triple(current)
  const b = triple(latest)
  // 모양을 못 읽으면 낡았다고 말하지 않는다 — 없는 경고가 있는 경고보다 나쁘다
  if (!a || !b) return false
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const left = a[i] ?? 0
    const right = b[i] ?? 0
    if (left !== right) return right > left
  }
  return false
}

/** 갱신을 누구에게 부탁해야 하는가 — 실측: Homebrew 설치는 Caskroom 아래 산다 */
export function managerOf(binaryPath: string): string | null {
  if (binaryPath.includes('/Caskroom/')) return 'Homebrew'
  if (binaryPath.includes('/node_modules/')) return 'npm'
  return null
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npm test -- src/entities/agent-session/model/cli-update.test.ts`
Expected: PASS (5개)

- [ ] **Step 5: `electron/cli-version.ts` 를 쓴다**

IO 만 한다 — 판단은 위의 순수 함수가 이미 진다. `electron/auth.ts` 의 spawn 관용구를 따른다.

```ts
import { spawn } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { ipcMain } from 'electron'
import { managerOf } from '../src/entities/agent-session/model/cli-update'
import { agentEnv } from '../src/shared/lib/shell-env'
import { loginPath } from './login-path'

/**
 * CLI 의 최신 버전을 **읽기만** 한다.
 *
 * `claude update` 에는 dry-run 이 없다 (실측 2026-08-14: 옵션이 -h 뿐). npm 설치
 * 환경에서 그것을 주기적으로 돌리면 물었을 뿐인데 설치까지 해버리고, 도는 세션
 * 뒤에서 엔진이 바뀐다. 그래서 읽기는 레지스트리 조회로만 하고, 설치는 사람이
 * 버튼을 눌렀을 때만 시작한다.
 */
const REGISTRY = 'https://registry.npmjs.org/@anthropic-ai/claude-code/latest'

/** 네트워크가 없거나 느린 것은 오류가 아니다 — 모른다고 말하고 넘어간다 */
const FETCH_TIMEOUT_MS = 5000

async function latestVersion(): Promise<string | null> {
  try {
    const response = await fetch(REGISTRY, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!response.ok) return null
    const body = (await response.json()) as { version?: unknown }
    return typeof body.version === 'string' ? body.version : null
  } catch {
    return null
  }
}

/** 실행 파일이 어디 사는지로 관리 주체를 안다. PATH 에서 못 찾으면 모른다 */
async function manager(): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn('which', ['claude'], { env: agentEnv(process.env, null) })
    let out = ''
    child.stdout.on('data', (chunk: Buffer) => {
      out += chunk.toString('utf8')
    })
    child.on('error', () => resolve(null))
    child.on('exit', () => {
      const path = out.trim()
      if (path.length === 0) return resolve(null)
      try {
        // Homebrew 는 심볼릭 링크를 세워둔다 — 실제 자리를 봐야 Caskroom 이 보인다
        resolve(managerOf(realpathSync(path)))
      } catch {
        resolve(managerOf(path))
      }
    })
  })
}

export function registerCliVersion(): void {
  ipcMain.handle('cli:latest', async () => {
    const [latest, managedBy] = await Promise.all([latestVersion(), manager()])
    return { latest, managedBy }
  })

  /**
   * 사람이 누른 갱신. CLI 의 말을 그대로 돌려준다 —
   * Homebrew 가 관리하면 CLI 가 직접 그렇게 말하고 설치하지 않는다.
   * 우리가 `brew` 를 대신 돌리는 일은 없다: 시스템 패키지 관리자는 앱의 것이 아니다.
   */
  ipcMain.handle('cli:update', async () => {
    const path = await loginPath()
    return new Promise<{ output: string }>((resolve) => {
      const child = spawn('claude', ['update'], { env: agentEnv(process.env, path) })
      let output = ''
      const take = (chunk: Buffer): void => {
        output += chunk.toString('utf8')
      }
      child.stdout.on('data', take)
      child.stderr.on('data', take)
      child.on('error', () => resolve({ output: 'claude 명령을 찾지 못했습니다' }))
      child.on('exit', () => resolve({ output: output.trim().slice(-2000) }))
    })
  })
}
```

`electron/main.ts` 에서 `registerCliVersion()` 을 다른 `register*` 들과 나란히 부른다.

- [ ] **Step 6: 창구를 연다 (preload + desk 타입)**

`electron/preload.ts`:

```ts
  latestCliVersion: (): Promise<unknown> => ipcRenderer.invoke('cli:latest'),
  runCliUpdate: (): Promise<unknown> => ipcRenderer.invoke('cli:update'),
```

`src/shared/api/desk.ts` 의 `DeskBridge`:

```ts
  /**
   * CLI 의 최신 버전과 관리 주체. 읽기만 한다 — 설치는 사람이 시작한다
   * (`claude update` 에는 dry-run 이 없어서다)
   */
  latestCliVersion(): Promise<{ latest: string | null; managedBy: string | null }>
  /** 사람이 누른 갱신. CLI 가 낸 말을 그대로 돌려준다 */
  runCliUpdate(): Promise<{ output: string }>
```

- [ ] **Step 7: 렌더러에서 잇는다**

`src/pages/workspace/model/use-cli-update.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { conversation } from './conversation'
import { statusStore } from '@/entities/agent-session'

/**
 * CLI 버전을 한 번 묻고, 사람이 누르면 갱신을 시작한다.
 *
 * 현재 버전은 세션의 init 이 준다 (`cliVersion`) — 그래서 세션이 열린 뒤에
 * 물어야 비교할 것이 생긴다. 갱신 결과는 대화의 사건 줄로 남긴다:
 * CLI 가 무슨 말을 했는지 요약하지 않아야 사람이 다음 손을 정할 수 있다.
 */
export function useCliUpdate(cliVersion: string | null): { updating: boolean; start(): void } {
  const [updating, setUpdating] = useState(false)
  const asked = useRef(false)

  useEffect(() => {
    if (!cliVersion || asked.current) return
    asked.current = true
    window.desk
      .latestCliVersion()
      .then(({ latest, managedBy }) => {
        statusStore.setUpdate({ current: cliVersion, latest, managedBy })
      })
      .catch(() => {
        // 못 물어본 것과 최신인 것은 다르다 — latest 를 null 로 남긴다
        statusStore.setUpdate({ current: cliVersion, latest: null, managedBy: null })
      })
  }, [cliVersion])

  const start = useCallback(() => {
    setUpdating(true)
    window.desk
      .runCliUpdate()
      .then(({ output }) => {
        conversation.system(output)
      })
      .catch(() => conversation.system('갱신을 시작하지 못했습니다'))
      .finally(() => setUpdating(false))
  }, [])

  return { updating, start }
}
```

`WorkspaceScreen.tsx` 에서:

```tsx
const cliUpdate = useCliUpdate(agent.status.session?.cliVersion ?? null)
// …ConversationPane 에…
  onUpdateCli={cliUpdate.start}
  updatingCli={cliUpdate.updating}
```

- [ ] **Step 8: 전체 테스트·타입검사·커밋**

Run: `npm test && npm run typecheck`
Expected: PASS

```bash
git add src/entities/agent-session/ electron/ src/shared/api/desk.ts src/pages/workspace/
git commit -m "feat: 업데이트 — 읽기는 레지스트리, 설치는 사람이 시작

claude update 에 dry-run 이 없어(실측) 주기 실행은 곧 몰래 설치다.
버전 비교는 의존성 없이 직접 하고, brew 는 우리가 대신 돌리지 않는다."
```

---

### Task 9: 토큰 단위 스트리밍 — 초안과 확정본

**Files:**
- Modify: `src/entities/agent-session/model/run-config.ts` (`--include-partial-messages`)
- Modify: `src/entities/agent-session/model/run-config.test.ts`
- Modify: `src/entities/agent-session/api/claude/turn.ts` (델타 이벤트)
- Modify: `src/entities/agent-session/api/claude/parse.test.ts` (델타 케이스 추가)
- Modify: `src/pages/workspace/model/conversation.ts` (`draft`)
- Modify: `src/pages/workspace/model/conversation.test.ts`
- Modify: `src/pages/workspace/model/use-agent.ts`
- Modify: `src/widgets/conversation/ui/ConversationPane.tsx`

**Interfaces:**
- Consumes: `TurnEvent` (Task 2)
- Produces: `TurnEvent` 에 `{ type: 'delta'; text: string }` 추가, `Turn.draft: string`, `conversation.delta(text: string): void`

- [ ] **Step 1: 인자 테스트를 더한다** (`run-config.test.ts`)

```ts
  it('부분 메시지를 켠다 — 글자가 흐르지 않으면 기다림이 정지처럼 보인다', () => {
    const args = agentArgs({ permissionMode: 'ask', model: 'default', persona: '' })
    expect(args).toContain('--include-partial-messages')
  })
```

- [ ] **Step 2: 실패 확인 → `agentArgs` 에 인자 추가 → 통과 확인**

Run: `npm test -- src/entities/agent-session/model/run-config.test.ts`
Expected: 처음 FAIL, `'--include-partial-messages'` 를 `'--verbose'` 다음에 넣은 뒤 PASS

- [ ] **Step 3: 델타 파싱의 실패하는 테스트를 쓴다** (`parse.test.ts` 에 추가)

```ts
  it('부분 메시지의 텍스트 델타를 초안으로 낸다', () => {
    const events = parseClaudeLine(
      JSON.stringify({
        type: 'stream_event',
        event: { type: 'content_block_delta', delta: { type: 'text_delta', text: '안녕' } },
      }),
    )
    expect(events).toEqual([{ type: 'delta', text: '안녕' }])
  })

  it('자식의 델타는 부모의 초안이 아니다', () => {
    const events = parseClaudeLine(
      JSON.stringify({
        type: 'stream_event',
        parent_tool_use_id: 'toolu_1',
        event: { type: 'content_block_delta', delta: { type: 'text_delta', text: '자식 말' } },
      }),
    )
    expect(events).toEqual([])
  })

  it('텍스트가 아닌 델타는 초안에 넣지 않는다', () => {
    const events = parseClaudeLine(
      JSON.stringify({
        type: 'stream_event',
        event: { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '{"a"' } },
      }),
    )
    expect(events).toEqual([])
  })
```

- [ ] **Step 4: `turn.ts` 에 델타를 더하고 `parse.ts` 가 `stream_event` 를 넘긴다**

```ts
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
```

`parse.ts` 의 분기에 `if (event.type === 'stream_event') return fromStreamEvent(event)` 를 더한다.

Run: `npm test -- src/entities/agent-session/api/claude/`
Expected: PASS

- [ ] **Step 5: `conversation` 의 초안 테스트를 쓴다**

```ts
  it('델타는 초안에 쌓인다 — 아직 확정된 말이 아니다', () => {
    conversation.delta('안')
    conversation.delta('녕')
    const turn = conversation.get().turns.at(-1)!
    expect(turn.role).toBe('assistant')
    expect(turn.draft).toBe('안녕')
    expect(turn.text).toBe('')
  })

  it('확정된 말이 오면 초안을 버린다 — 같은 문장이 두 번 뜨지 않게 (실측 근거)', () => {
    conversation.delta('안녕')
    conversation.say('assistant', '안녕')
    const turn = conversation.get().turns.at(-1)!
    expect(turn.draft).toBe('')
    expect(turn.text).toBe('안녕')
    expect(conversation.get().turns).toHaveLength(1)
  })

  it('도구를 쓴 뒤의 델타는 새 차례를 연다', () => {
    conversation.say('assistant', '읽습니다')
    conversation.tool('Read a.ts')
    conversation.delta('고쳤')
    expect(conversation.get().turns).toHaveLength(2)
    expect(conversation.get().turns.at(-1)!.draft).toBe('고쳤')
  })
```

- [ ] **Step 6: 실패 확인 → `conversation.ts` 를 고친다**

`Turn` 에 `draft: string` 을 더하고(모든 생성 지점에 `draft: ''`), `say` 가 확정 시 초안을 비운다:

```ts
  say(role: Turn['role'], text: string): void {
    const target = appendable(role)
    if (target) {
      // 초안은 확정본이 오면 버려진다 — 이어붙이면 같은 문장이 두 번 뜬다 (실측)
      const merged = {
        ...target,
        draft: '',
        text: target.text.length === 0 ? text : `${target.text}\n\n${text}`,
      }
      emit({ ...state, turns: [...state.turns.slice(0, -1), merged] })
      return
    }
    emit({
      ...state,
      turns: [...state.turns, { role, text, tools: [], draft: '', startedAtMs: Date.now() }],
    })
  },

  /** 흐르는 초안. 확정된 말이 오면 say 가 이것을 비운다 */
  delta(text: string): void {
    const last = state.turns.at(-1)
    if (!last || last.role !== 'assistant' || last.tools.length > 0) {
      emit({
        ...state,
        turns: [...state.turns, { role: 'assistant', text: '', tools: [], draft: text, startedAtMs: Date.now() }],
      })
      return
    }
    const merged = { ...last, draft: last.draft + text }
    emit({ ...state, turns: [...state.turns.slice(0, -1), merged] })
  },
```

`appendable` 에서 `target.text.length === 0` 인 경우를 위해 위 `say` 처럼 빈 텍스트에 `\n\n` 을 붙이지 않게 한다 (초안만 있던 차례가 확정될 때 앞에 빈 줄이 생기는 것을 막는다).

Run: `npm test -- src/pages/workspace/model/conversation.test.ts`
Expected: PASS

- [ ] **Step 7: `use-agent` 와 `ConversationPane` 을 잇는다**

`use-agent.ts` 루프에 `if (turn.type === 'delta') conversation.delta(turn.text)`.

`ConversationPane` 의 assistant 분기에서 본문 아래에 초안을 그린다 — **같은 활자**여야 확정될 때 글자가 튀지 않는다:

```tsx
              {turn.draft.length > 0 && (
                <div className="font-serif text-[15.5px] leading-[1.68] whitespace-pre-wrap [overflow-wrap:anywhere]">
                  {turn.draft}
                  {/* 흐르는 중임을 말하는 커서 한 칸 — 스피너와 달리 글자와 같은 줄에 선다 */}
                  <span className="ml-0.5 inline-block h-[1em] w-[0.5ch] translate-y-[0.1em] bg-current align-baseline opacity-70 animate-[tile-pulse_1.2s_ease-in-out_infinite]" />
                </div>
              )}
```

또한 `turn.text.length > 0` 조건 때문에 초안만 있는 차례가 비지 않도록 두 블록이 나란히 서게 한다.

`railLength(turn)` 은 `turn.text.length` 만 보므로 초안이 흐르는 동안 레일이 자라지 않는다 — `turn.text.length + turn.draft.length` 로 바꾼다 (빛이 흐를 거리가 글의 길이를 따라야 한다).

- [ ] **Step 8: 전체 테스트·타입검사·커밋**

Run: `npm test && npm run typecheck`
Expected: PASS

```bash
git add src/entities/agent-session/ src/pages/workspace/ src/widgets/conversation/
git commit -m "feat: 토큰 단위 스트리밍 — 초안이 흐르고 확정본이 갈아끼운다

실측: 델타 뒤에 완성된 assistant 가 또 온다. 이어붙이면 두 번 뜨므로
say 가 초안을 버린다. 커서는 같은 세리프 줄에 선다."
```

---

### Task 10: 생각과 도구 결과

**Files:**
- Modify: `src/entities/agent-session/api/claude/turn.ts`
- Modify: `src/entities/agent-session/api/claude/child.ts` (도구 결과가 자식 것인지 가르는 자리)
- Modify: `src/entities/agent-session/api/claude/parse.test.ts`
- Modify: `src/pages/workspace/model/conversation.ts` (`tools` 가 객체가 된다)
- Modify: `src/pages/workspace/model/conversation.test.ts`
- Modify: `src/pages/workspace/model/use-agent.ts`
- Modify: `src/widgets/conversation/ui/ConversationPane.tsx`

**Interfaces:**
- Consumes: Task 2·9 의 `TurnEvent`
- Produces:
  - `TurnEvent` 에 `{ type: 'thinking'; text: string }` 과 `{ type: 'toolResult'; toolUseId: string; stdout: string; stderr: string; isError: boolean; interrupted: boolean }` 추가
  - `stream` 이벤트가 `{ type: 'stream'; line: string; toolUseId: string | null }` 로 넓어진다
  - `Turn.tools: ToolActivity[]` where `ToolActivity = { line: string; toolUseId: string | null; result: ToolResult | null }`, `ToolResult = { stdout: string; stderr: string; isError: boolean; interrupted: boolean }`
  - `Turn.thinking: string`
  - `conversation.tool(line: string, toolUseId: string | null): void`, `conversation.think(text: string): void`, `conversation.toolResult(toolUseId: string, result: ToolResult): void`

- [ ] **Step 1: Task 1 의 관측을 읽고 thinking 을 어디서 읽을지 정한다**

`docs/superpowers/notes/2026-08-14-stream-shapes.md` 의 결론을 본다.
- 확정 `assistant` 에 `thinking` 블록이 온다면 → `fromAssistant` 에서 읽는다
- `stream_event` 의 `thinking_delta` 로만 온다면 → `fromStreamEvent` 에서 읽고 초안처럼 누적한다 (단 확정본이 없으므로 **버리지 않는다**)

아래 Step 2·4 는 전자를 가정한 코드다. 후자라면 같은 테스트를 `stream_event` 페이로드로 쓰고 `fromStreamEvent` 에 넣는다 — 이벤트 타입(`{type:'thinking'; text}`)과 그 아래 화면 코드는 그대로다.

- [ ] **Step 2: 실패하는 테스트를 쓴다** (`parse.test.ts`)

```ts
  it('생각 블록을 자기 이벤트로 낸다 — 본문과 다른 목소리다', () => {
    const events = parseClaudeLine(
      JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'thinking', thinking: '17 * 23 은 17 * 20 + 17 * 3' },
            { type: 'text', text: '391 입니다' },
          ],
        },
      }),
    )
    expect(events).toEqual([
      { type: 'thinking', text: '17 * 23 은 17 * 20 + 17 * 3' },
      { type: 'headline', text: '391 입니다' },
    ])
  })

  it('도구 활동이 자기 id 를 들고 온다 — 결과를 그 눈금에 붙이려면 필요하다', () => {
    const events = parseClaudeLine(
      JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', id: 'toolu_9', name: 'Bash', input: { command: 'ls -la' } }],
        },
      }),
    )
    expect(events).toEqual([{ type: 'stream', line: 'Bash ls -la', toolUseId: 'toolu_9' }])
  })

  it('도구 결과의 출력을 그대로 들고 온다', () => {
    const events = parseClaudeLine(
      JSON.stringify({
        type: 'user',
        message: {
          content: [{ tool_use_id: 'toolu_9', type: 'tool_result', content: 'total 40', is_error: false }],
        },
        tool_use_result: { stdout: 'total 40', stderr: '', interrupted: false },
      }),
    )
    expect(events).toEqual([
      {
        type: 'toolResult',
        toolUseId: 'toolu_9',
        stdout: 'total 40',
        stderr: '',
        isError: false,
        interrupted: false,
      },
    ])
  })

  it('실패한 도구는 실패로 표시된다 — 조용히 삼키면 화면이 거짓말한다', () => {
    const [event] = parseClaudeLine(
      JSON.stringify({
        type: 'user',
        message: {
          content: [{ tool_use_id: 'toolu_9', type: 'tool_result', content: 'no such file', is_error: true }],
        },
      }),
    )
    expect(event).toMatchObject({ type: 'toolResult', isError: true, stdout: 'no such file' })
  })
```

- [ ] **Step 3: 실패를 확인한다**

Run: `npm test -- src/entities/agent-session/api/claude/parse.test.ts`
Expected: FAIL — `stream` 에 `toolUseId` 가 없고 `thinking`·`toolResult` 이벤트가 없다

- [ ] **Step 4: `turn.ts` 를 고친다**

- `TurnEvent` 에 두 종류를 더하고 `stream` 에 `toolUseId` 를 넣는다
- `fromAssistant` 의 `tool_use` 분기에서 `toolUseId: typeof block.id === 'string' ? block.id : null` 을 함께 낸다
- `thinking` 블록 분기를 더한다:

```ts
    // 생각은 읽으라고 있는 문장이지만 결론은 아니다 — 본문과 갈라서 낸다
    if (block.type === 'thinking' && typeof block.thinking === 'string' && block.thinking.length > 0) {
      out.push({ type: 'thinking', text: block.thinking })
    }
```

- `user` 의 `tool_result` 는 지금 `child.ts` 의 `childCloses` 가 자식 닫힘으로만 본다. **자식인지 아닌지는 러너(use-agent)가 안다** — 파서는 둘 다 낸다. `child.ts` 의 `childCloses` 를 그대로 두고, `turn.ts` 에 `fromToolResult(event)` 를 더해 `parse.ts` 가 두 결과를 합친다:

```ts
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
```

`parse.ts` 의 `user` 분기: `return parent ? childSays(...) : [...childCloses(event), ...fromToolResult(event)]`

Run: `npm test -- src/entities/agent-session/api/claude/`
Expected: PASS

- [ ] **Step 5: `conversation` 의 `tools` 를 객체로 바꾸는 테스트를 쓴다**

기존 `toEqual(['Read src/a.ts', 'Edit src/a.ts'])` 형태의 두 케이스가 깨진다. **지우지 말고** 새 모양으로 고친다:

```ts
    expect(last.tools.map((tool) => tool.line)).toEqual(['Read src/a.ts', 'Edit src/a.ts'])
```

새 테스트:

```ts
  it('도구 결과는 그 눈금에 붙는다 — 어느 도구의 출력인지가 남아야 한다', () => {
    conversation.tool('Bash ls -la', 'toolu_9')
    conversation.toolResult('toolu_9', { stdout: 'total 40', stderr: '', isError: false, interrupted: false })
    const tool = conversation.get().turns.at(-1)!.tools[0]!
    expect(tool.result?.stdout).toBe('total 40')
  })

  it('짝 없는 결과는 버린다 — 어디에 붙일지 모르는 출력은 화면에 세우지 않는다', () => {
    conversation.tool('Bash ls', 'toolu_1')
    conversation.toolResult('없는id', { stdout: 'x', stderr: '', isError: false, interrupted: false })
    expect(conversation.get().turns.at(-1)!.tools[0]!.result).toBeNull()
  })

  it('생각은 차례에 붙되 본문과 섞이지 않는다', () => {
    conversation.think('먼저 파일을 봐야 한다')
    conversation.say('assistant', '봤습니다')
    const turn = conversation.get().turns.at(-1)!
    expect(turn.thinking).toBe('먼저 파일을 봐야 한다')
    expect(turn.text).toBe('봤습니다')
  })
```

- [ ] **Step 6: 실패 확인 → `conversation.ts` 를 고친다**

```ts
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
  result: ToolResult | null
}
```

`Turn` 에 `tools: ToolActivity[]` 와 `thinking: string` (모든 생성 지점에 `thinking: ''`). `tool(line, toolUseId)` 는 `{ line, toolUseId, result: null }` 을 밀어 넣고, 새 메서드 둘:

```ts
  /** 도구가 낸 출력이 그 눈금에 붙는다. 어느 차례의 눈금인지는 id 가 안다 */
  toolResult(toolUseId: string, result: ToolResult): void {
    const index = state.turns.findIndex((turn) =>
      turn.tools.some((tool) => tool.toolUseId === toolUseId),
    )
    if (index === -1) return // 짝을 모르는 출력은 세울 자리가 없다
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
        turns: [...state.turns, { role: 'assistant', text: '', tools: [], draft: '', thinking: text, startedAtMs: Date.now() }],
      })
      return
    }
    const merged = { ...last, thinking: last.thinking ? `${last.thinking}\n\n${text}` : text }
    emit({ ...state, turns: [...state.turns.slice(0, -1), merged] })
  },
```

Run: `npm test -- src/pages/workspace/model/conversation.test.ts`
Expected: PASS

- [ ] **Step 7: `use-agent` 와 `ConversationPane` 을 잇는다**

`use-agent.ts`:
- `stream` → `conversation.tool(turn.line, turn.toolUseId)`
- `thinking` → `conversation.think(turn.text)`
- `toolResult` → **자식의 것이 아닐 때만** `conversation.toolResult(...)`. 자식 판별은 이미 있는 `childIds` 로 한다:

```ts
        if (turn.type === 'toolResult' && !childIds.current.has(turn.toolUseId)) {
          conversation.toolResult(turn.toolUseId, {
            stdout: turn.stdout, stderr: turn.stderr, isError: turn.isError, interrupted: turn.interrupted,
          })
        }
```

`ConversationPane`:
- 생각: 본문 **위에**, 기본 접힘

```tsx
              {turn.thinking.length > 0 && <Thinking text={turn.thinking} />}
```

```tsx
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
```

- 도구 눈금: 줄을 눌러 결과를 연다. `isError` 면 처음부터 열려 있다

```tsx
/** 눈금 하나 — 누르면 그 도구가 낸 출력이 아래로 열린다. 실패는 기본 펼침 */
function Tick({ tool, live }: { tool: ToolActivity; live: boolean }) {
  const [open, setOpen] = useState(tool.result?.isError === true)
  const output = [tool.result?.stdout, tool.result?.stderr].filter(Boolean).join('\n')
  const lines = output.split('\n')
  const shown = lines.slice(0, TOOL_OUTPUT_LINES).join('\n')
  const rest = lines.length - TOOL_OUTPUT_LINES

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        disabled={!tool.result}
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
      {open && output.length > 0 && (
        <pre className="zt-scroll max-h-56 overflow-auto border-l border-current/20 pl-2 font-mono text-[10.5px] leading-normal whitespace-pre-wrap opacity-70">
          {shown}
          {rest > 0 ? `\n… ${rest}줄 더 있음` : ''}
        </pre>
      )}
    </div>
  )
}
```

`const TOOL_OUTPUT_LINES = 40` 을 파일 상단 상수로 둔다 (`HEADLINE_MAX` 옆 관용구).

`turn.tools.map` 을 `<Tick key={…} tool={tool} live={live && index === turn.tools.length - 1} />` 로 바꾼다.

- [ ] **Step 8: 전체 테스트·타입검사·커밋**

Run: `npm test && npm run typecheck`
Expected: PASS

```bash
git add src/entities/agent-session/ src/pages/workspace/ src/widgets/conversation/
git commit -m "feat: 생각과 도구 결과 — 눈금을 누르면 출력이 열린다

도구 활동이 자기 id 를 들게 해 결과를 제 눈금에 붙인다. 실패한 도구는
기본 펼침 — 이유가 화면에 없으면 화면이 거짓말한다."
```

---

### Task 11: 도구 전용 렌더 — diff 와 할 일

**Files:**
- Create: `src/widgets/conversation/lib/diff.ts`
- Create: `src/widgets/conversation/lib/diff.test.ts`
- Create: `src/widgets/conversation/ui/ToolDetail.tsx`
- Create: `src/widgets/conversation/ui/ToolDetail.test.tsx`
- Modify: `src/entities/agent-session/api/claude/turn.ts` (도구 입력을 함께 낸다)
- Modify: `src/entities/agent-session/api/claude/parse.test.ts`
- Modify: `src/pages/workspace/model/conversation.ts` (`ToolActivity.input`)
- Modify: `src/widgets/conversation/ui/ConversationPane.tsx`

**Interfaces:**
- Consumes: `ToolActivity` (Task 10)
- Produces:
  - `diff.ts` → `export type DiffLine = { kind: 'add' | 'remove' | 'same'; text: string }`, `export function lineDiff(before: string, after: string, context?: number): DiffLine[]`
  - `ToolDetail.tsx` → `export function ToolDetail({ tool }: { tool: ToolActivity }): ReactNode | null`
  - `ToolActivity` 에 `input: unknown` 추가 (도구 입력 원본 — 전용 렌더의 재료)

- [ ] **Step 1: diff 의 실패하는 테스트를 쓴다**

의존성을 늘리지 않으므로 최소한의 줄 단위 diff 를 직접 쓴다. `Edit` 은 `old_string`/`new_string` 을 주므로 두 덩어리를 줄로 갈라 비교하는 것으로 충분하다 — 파일 전체 diff 가 아니다.

```ts
import { describe, expect, it } from 'vitest'
import { lineDiff } from './diff'

describe('lineDiff — Edit 의 두 덩어리를 눈으로 비교한다', () => {
  it('바뀐 줄만 +/- 로 가른다', () => {
    expect(lineDiff('a\nb\nc', 'a\nB\nc')).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'remove', text: 'b' },
      { kind: 'add', text: 'B' },
      { kind: 'same', text: 'c' },
    ])
  })

  it('추가만 있으면 + 만 난다', () => {
    expect(lineDiff('a', 'a\nb')).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'add', text: 'b' },
    ])
  })

  it('삭제만 있으면 - 만 난다', () => {
    expect(lineDiff('a\nb', 'a')).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'remove', text: 'b' },
    ])
  })

  it('같은 줄이 길게 이어지면 문맥만 남긴다 — 읽을 것은 바뀐 자리다', () => {
    const before = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'x'].join('\n')
    const after = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'y'].join('\n')
    const diff = lineDiff(before, after, 2)
    expect(diff.filter((line) => line.kind === 'same').length).toBeLessThanOrEqual(4)
    expect(diff.some((line) => line.text === '…')).toBe(true)
    expect(diff.some((line) => line.kind === 'remove' && line.text === 'x')).toBe(true)
  })

  it('빈 문자열끼리는 아무 줄도 내지 않는다', () => {
    expect(lineDiff('', '')).toEqual([])
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test -- src/widgets/conversation/lib/diff.test.ts`
Expected: FAIL — `Failed to resolve import "./diff"`

- [ ] **Step 3: `diff.ts` 를 쓴다**

```ts
/**
 * 줄 단위 diff — 의존성을 늘리지 않기 위해 직접 쓴다.
 *
 * 우리가 비교하는 것은 파일 전체가 아니라 Edit 이 준 두 덩어리(old_string / new_string)다.
 * 그래서 최장공통부분수열 같은 것이 필요하지 않다: 앞뒤로 같은 줄을 깎아내고
 * 남은 가운데를 통째로 -/+ 로 낸다. 사람이 보려는 것은 "무엇이 바뀌었나" 하나다.
 */
export type DiffLine = { kind: 'add' | 'remove' | 'same'; text: string }

/** 바뀐 자리 위아래로 남길 같은 줄의 수 */
const CONTEXT = 3

export function lineDiff(before: string, after: string, context = CONTEXT): DiffLine[] {
  if (before.length === 0 && after.length === 0) return []
  const a = before.length === 0 ? [] : before.split('\n')
  const b = after.length === 0 ? [] : after.split('\n')

  let head = 0
  while (head < a.length && head < b.length && a[head] === b[head]) head += 1

  let tail = 0
  while (
    tail < a.length - head &&
    tail < b.length - head &&
    a[a.length - 1 - tail] === b[b.length - 1 - tail]
  ) {
    tail += 1
  }

  const out: DiffLine[] = []
  const headShown = Math.min(head, context)
  // 앞이 길게 같으면 잘렸다는 사실을 한 줄로 알린다 — 조용히 없어지면 화면이 거짓말한다
  if (head > headShown) out.push({ kind: 'same', text: '…' })
  for (const text of a.slice(head - headShown, head)) out.push({ kind: 'same', text })

  for (const text of a.slice(head, a.length - tail)) out.push({ kind: 'remove', text })
  for (const text of b.slice(head, b.length - tail)) out.push({ kind: 'add', text })

  const tailShown = Math.min(tail, context)
  for (const text of a.slice(a.length - tail, a.length - tail + tailShown)) {
    out.push({ kind: 'same', text })
  }
  if (tail > tailShown) out.push({ kind: 'same', text: '…' })

  return out
}
```

Run: `npm test -- src/widgets/conversation/lib/diff.test.ts`
Expected: PASS

- [ ] **Step 4: 도구 입력을 눈금까지 실어 보낸다**

`turn.ts` 의 `stream` 이벤트에 `input: block.input` 을 더한다. 파서 테스트에 한 줄:

```ts
  it('도구 입력을 함께 실어 온다 — 전용 렌더의 재료다', () => {
    const [event] = parseClaudeLine(
      JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', id: 't1', name: 'Edit', input: { file_path: 'a.ts', old_string: 'a', new_string: 'b' } }],
        },
      }),
    )
    expect(event).toMatchObject({ type: 'stream', input: { file_path: 'a.ts', old_string: 'a', new_string: 'b' } })
  })
```

`conversation.tool(line, toolUseId, input)` 로 넓히고 `ToolActivity.input: unknown` 에 담는다. 기존 `conversation.test.ts` 의 `tool(...)` 호출은 인자가 늘어도 그대로 돈다 (`input` 은 `undefined` → `null` 로 저장).

Run: `npm test -- src/entities/agent-session/ src/pages/workspace/`
Expected: PASS

- [ ] **Step 5: `ToolDetail` 의 실패하는 테스트를 쓴다**

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ToolActivity } from '@/pages/workspace/model/conversation'
import { ToolDetail } from './ToolDetail'

function tool(overrides: Partial<ToolActivity>): ToolActivity {
  return { line: 'Edit a.ts', toolUseId: 't1', input: null, result: null, ...overrides }
}

describe('ToolDetail — 도구마다 제 모양으로', () => {
  it('Edit 은 바뀐 줄을 +/- 로 보인다', () => {
    const html = renderToStaticMarkup(
      <ToolDetail tool={tool({ line: 'Edit a.ts', input: { file_path: 'a.ts', old_string: 'const a = 1', new_string: 'const a = 2' } })} />,
    )
    expect(html).toContain('const a = 1')
    expect(html).toContain('const a = 2')
    expect(html).toContain('−') // 삭제 표식
    expect(html).toContain('+')
  })

  it('Write 는 새로 쓰는 내용을 전부 + 로 보인다', () => {
    const html = renderToStaticMarkup(
      <ToolDetail tool={tool({ line: 'Write b.ts', input: { file_path: 'b.ts', content: 'hi' } })} />,
    )
    expect(html).toContain('hi')
    expect(html).toContain('+')
  })

  it('TodoWrite 는 체크리스트로 서고 진행 중 하나가 드러난다', () => {
    const html = renderToStaticMarkup(
      <ToolDetail
        tool={tool({
          line: 'TodoWrite',
          input: {
            todos: [
              { content: '파서 쪼개기', status: 'completed' },
              { content: '상태줄 세우기', status: 'in_progress' },
              { content: 'diff 렌더', status: 'pending' },
            ],
          },
        })}
      />,
    )
    expect(html).toContain('파서 쪼개기')
    expect(html).toContain('상태줄 세우기')
    expect(html).toContain('✓')
    expect(html).toContain('animate-') // 진행 중 하나만 맥동한다
  })

  it('전용 렌더가 없는 도구에는 아무것도 그리지 않는다', () => {
    expect(renderToStaticMarkup(<ToolDetail tool={tool({ line: 'Bash ls', input: { command: 'ls' } })} />)).toBe('')
  })

  it('입력이 기대한 모양이 아니면 그리지 않는다 — 모르는 것을 지어내지 않는다', () => {
    expect(renderToStaticMarkup(<ToolDetail tool={tool({ line: 'Edit a.ts', input: { file_path: 'a.ts' } })} />)).toBe('')
    expect(renderToStaticMarkup(<ToolDetail tool={tool({ line: 'TodoWrite', input: { todos: '이상함' } })} />)).toBe('')
  })
})
```

- [ ] **Step 6: 실패를 확인한다**

Run: `npm test -- src/widgets/conversation/ui/ToolDetail.test.tsx`
Expected: FAIL — `Failed to resolve import "./ToolDetail"`

- [ ] **Step 7: `ToolDetail.tsx` 를 쓴다**

```tsx
import type { ToolActivity } from '@/pages/workspace/model/conversation'
import { cn } from '@/shared/lib/cn'
import { lineDiff } from '../lib/diff'

/**
 * 도구마다 제 모양으로 — 파일이 바뀌는 것은 diff 로, 할 일은 체크리스트로.
 *
 * 도구 이름 한 줄로는 무엇이 바뀌는지 알 수 없다. 그렇다고 모든 도구에 전용
 * 렌더를 주면 화면이 도구 사전이 된다 — 사람이 결과를 눈으로 확인해야 하는
 * 셋(파일 수정·파일 생성·할 일)만 든다. 나머지는 stdout 이 이미 말한다.
 */
export function ToolDetail({ tool }: { tool: ToolActivity }) {
  const name = tool.line.split(' ')[0] ?? ''
  const input = (typeof tool.input === 'object' && tool.input !== null ? tool.input : {}) as Record<string, unknown>

  if (name === 'Edit' || name === 'MultiEdit') {
    if (typeof input.old_string !== 'string' || typeof input.new_string !== 'string') return null
    return <Diff lines={lineDiff(input.old_string, input.new_string)} />
  }

  if (name === 'Write') {
    if (typeof input.content !== 'string') return null
    return <Diff lines={lineDiff('', input.content)} />
  }

  if (name === 'TodoWrite') {
    if (!Array.isArray(input.todos)) return null
    const todos = (input.todos as Record<string, unknown>[]).filter(
      (todo) => typeof todo?.content === 'string',
    )
    if (todos.length === 0) return null
    return (
      <ul className="flex flex-col gap-0.5">
        {todos.map((todo, index) => {
          const status = typeof todo.status === 'string' ? todo.status : 'pending'
          return (
            <li
              key={`${index}-${String(todo.content)}`}
              className={cn(
                'flex items-baseline gap-1.5 font-mono text-[10.5px] leading-normal',
                status === 'completed' && 'opacity-45 line-through',
                status === 'in_progress' ? 'opacity-100' : 'opacity-70',
              )}
            >
              <span
                className={cn(
                  'flex-none',
                  // 지금 도는 하나만 맥동한다 — 작업 레일과 같은 문법
                  status === 'in_progress' && 'animate-[tile-pulse_2.4s_ease-in-out_infinite]',
                )}
              >
                {status === 'completed' ? '✓' : status === 'in_progress' ? '▸' : '·'}
              </span>
              <span className="[overflow-wrap:anywhere]">{String(todo.content)}</span>
            </li>
          )
        })}
      </ul>
    )
  }

  return null
}

/** +/- 는 색이 아니라 기호와 알파로 말한다 (§4.2) */
function Diff({ lines }: { lines: ReturnType<typeof lineDiff> }) {
  if (lines.length === 0) return null
  return (
    <pre className="zt-scroll max-h-56 overflow-auto border-l border-current/20 pl-2 font-mono text-[10.5px] leading-normal whitespace-pre-wrap">
      {lines.map((line, index) => (
        <div key={index} className={line.kind === 'same' ? 'opacity-45' : 'opacity-90'}>
          <span className="mr-1.5 inline-block w-[1ch] opacity-70">
            {line.kind === 'add' ? '+' : line.kind === 'remove' ? '−' : ' '}
          </span>
          {line.text}
        </div>
      ))}
    </pre>
  )
}
```

- [ ] **Step 8: 통과를 확인하고 `Tick` 에 끼운다**

Run: `npm test -- src/widgets/conversation/`
Expected: PASS

`Tick` 안에서 결과 `pre` **위에** `<ToolDetail tool={tool} />` 을 둔다 (무엇을 하려는지가 그 결과보다 먼저다). `ToolDetail` 이 무언가를 그리는 도구는 결과가 없어도 눈금을 누를 수 있어야 하므로 `disabled` 조건을 고친다:

```tsx
  const detail = <ToolDetail tool={tool} />
  const expandable = tool.result !== null || detail !== null
  // …button 의 disabled={!expandable}
  {open && (
    <div className="flex flex-col gap-1">
      {detail}
      {output.length > 0 && <pre …>{shown}…</pre>}
    </div>
  )}
```

`ToolDetail` 이 `null` 을 돌려주는지 컴포넌트 밖에서 알 수 없으므로, 판별은 `ToolDetail` 이 쓰는 것과 같은 조건을 노출한 순수 함수로 한다 — `ToolDetail.tsx` 에 함께 둔다:

```ts
/** 이 도구가 전용 렌더를 갖는가 — 눈금을 누를 수 있는지 정하는 데 쓴다 */
export function hasDetail(tool: ToolActivity): boolean {
  const name = tool.line.split(' ')[0] ?? ''
  const input = (typeof tool.input === 'object' && tool.input !== null ? tool.input : {}) as Record<string, unknown>
  if (name === 'Edit' || name === 'MultiEdit') return typeof input.old_string === 'string' && typeof input.new_string === 'string'
  if (name === 'Write') return typeof input.content === 'string'
  if (name === 'TodoWrite') return Array.isArray(input.todos)
  return false
}
```

`Tick` 은 `const expandable = tool.result !== null || hasDetail(tool)` 을 쓴다. `hasDetail` 의 테스트를 `ToolDetail.test.tsx` 에 두 줄 더한다:

```tsx
  it('전용 렌더가 있는 도구를 가려낸다', () => {
    expect(hasDetail(tool({ line: 'Edit a.ts', input: { old_string: 'a', new_string: 'b' } }))).toBe(true)
    expect(hasDetail(tool({ line: 'Bash ls', input: { command: 'ls' } }))).toBe(false)
  })
```

- [ ] **Step 9: 전체 테스트·타입검사·커밋**

Run: `npm test && npm run typecheck`
Expected: PASS

```bash
git add src/widgets/conversation/ src/entities/agent-session/ src/pages/workspace/
git commit -m "feat: 도구 전용 렌더 — Edit·Write 는 diff, TodoWrite 는 체크리스트

diff 는 의존성 없이 앞뒤 같은 줄을 깎는 방식으로 직접 쓴다. +/- 는
색이 아니라 기호와 알파로 말하고, 진행 중인 할 일 하나만 맥동한다."
```

---

### Task 12: 실기 검증 — 실제 CLI 와 실제 화면으로

단위 테스트는 파서와 스토어를 지키지만 "화면에 실제로 서는가" 는 지키지 못한다. 6회차가 CDP 실기로 확인했던 것과 같은 방식으로 이 회차를 닫는다.

**Files:**
- Modify: `docs/superpowers/specs/2026-08-14-status-surface.md` (검증 절에 실측 결과 기록)

- [ ] **Step 1: 앱을 띄운다**

```bash
npm run dev
```

`.idea` 나 기존 설정에 CDP 포트 지정이 있으면 그것을 따른다. 없으면 `--remote-debugging-port=9222` 를 붙여 띄우고 Playwright MCP 로 붙는다.

- [ ] **Step 2: 여섯 가지를 눈으로 확인한다**

스펙 §검증 의 목록 그대로. 각 항목에서 화면을 캡처한다:

1. 한 문장을 보내고 — 상태줄에 `컨텍스트 …` `$…` 칸이 서는가. 값이 채워지는 동안 줄이 흔들리지 않는가
2. 서랍을 열어 — MCP 줄이 전부 서고 `인증 필요` 가 굵게 드러나는가. 토큰 네 종류가 실제 숫자인가
3. 답이 오는 동안 — 글자가 흐르는가. 확정된 뒤 같은 문장이 두 번 뜨지 않는가
4. 도구를 쓰는 일을 시키고 — 눈금을 눌러 출력이 열리는가. 실패한 도구가 기본 펼침인가. `Edit` 이 diff 로, `TodoWrite` 가 체크리스트로 서는가
5. 한도 경고가 올 때 — 대화에 한 줄이 남고 상태줄 칸이 문장으로 부푸는가 (경고가 안 오면 `rate_limit_event` 한 줄을 `agent:event` 로 주입해 확인하고, 주입으로 확인했다는 사실을 기록한다)
6. 서랍의 환경 묶음이 `2.1.231 — 최신 (Homebrew)` 로 서는가

- [ ] **Step 3: 관측한 것을 스펙에 적는다**

`docs/superpowers/specs/2026-08-14-status-surface.md` 의 `## 검증 (CDP 실기)` 절을 실제 결과로 바꾼다. 기존 스펙들의 관용구를 따른다 — 무엇을 했고 무엇이 보였는지 사실만, 안 된 것은 안 된 대로.

```markdown
## 검증 (2026-08-14, CDP 실기)

우리 입력창에 한 문장 → … (관측한 것)

안 된 것: … (있으면 그대로)
```

- [ ] **Step 4: 커밋**

```bash
git add docs/superpowers/specs/2026-08-14-status-surface.md
git commit -m "docs: 7회차 실기 검증 — 상태줄·서랍·스트리밍·전용 렌더"
```

---

## Self-Review

**스펙 항목 → 태스크 대응**

| 스펙 요구 | 태스크 |
|---|---|
| 세션 신원 (init 전량) | 3(파서) · 4(스토어) · 7(서랍 세션 묶음) |
| 연결·능력 (MCP·수) | 3 · 4 · 6(상태줄 MCP 칸) · 7(서랍 연결 묶음) |
| 사용량 한도 | 3 · 4 · 5(대화 사건 줄) · 6(상태줄 칸) |
| 계기 (비용·토큰·ttft·턴) | 3 · 4 · 6 · 7 |
| 훅 | 3 · 4(짝짓기) · 7(환경 묶음) |
| 진행 (`system/status`) | 3 · 4 |
| 압축 | 1(모양 실측) · 3 · 5(사건 줄) |
| 도구 결과 | 10 |
| 생각 | 1(실측) · 10 |
| 업데이트 | 8 |
| 토큰 단위 스트리밍 | 9 |
| 도구 전용 렌더 | 11 |
| 파서 4분할 | 2 |
| 상태줄 다섯 칸 · 모르는 칸 없음 · 경고 부풂 | 6 |
| 서랍 네 묶음 · ≤40vh | 7 |
| CDP 실기 검증 | 12 |

빠진 스펙 항목 없음.

**이름 일관성 확인**

- `StatusEvent` 는 Task 3 에서 정의되고 4·5 에서 그 이름으로 쓰인다
- `statusStore.apply` / `setUpdate` / `reset` — Task 4 정의, 5·8 사용
- `ToolActivity` 는 Task 10 에서 `{line, toolUseId, result}` 로 나고 Task 11 에서 `input` 이 붙는다 (11 이 10 을 수정한다고 명시)
- `conversation.tool` 의 인자는 Task 10 에서 2개, Task 11 에서 3개로 넓어진다 (명시)
- `cells` / `contextPercent` — Task 6 정의, 같은 태스크 안에서만 쓰인다
- `isOutdated` / `managerOf` — Task 8 정의, `electron/cli-version.ts` 와 `format.ts`(간접) 에서 쓰인다. `format.ts` 는 `isOutdated` 를 쓰지 않고 문자열 비교(`latest !== current`)를 하므로 이름 충돌 없음 — 상태줄은 "다르면 새 버전" 으로 충분하고, 정확한 비교는 갱신 버튼을 세울지 정하는 `StatusDrawer` 의 `stale` 판정에서 한다

**남은 위험**

- Task 3 Step 6 — 기존 `parse.test.ts` 의 `toEqual` 케이스가 계기 이벤트 때문에 깨질 수 있다. 계획이 "지우지 말고 기대값을 넓혀라" 를 명시했다
- Task 10 — `thinking` 이 어디로 오는지가 Task 1 의 실측에 달려 있다. 두 경로 모두에 대한 지시가 Step 1 에 있다

---

### Task 13: 워드마크 — 이름이 화면에 서는 자리

> 이 태스크는 실행 도중 사용자가 추가로 요청했다 (붓글씨 로고를 주며 "활용해서 디자인도 손봐").
> 앞의 열두 태스크와 달리 계획 단계의 검토를 거치지 않았으므로, 결정의 근거를 각 단계에 적어 둔다.

**Files:**
- Create: `src/shared/ui/wordmark.tsx`
- Create: `src/shared/ui/wordmark.test.tsx`
- Modify: `src/widgets/setup/ui/SetupPane.tsx`
- Modify: `src/widgets/conversation/ui/ConversationPane.tsx` (첫 화면 분기만)
- 이미 커밋됨: `src/shared/assets/wordmark.png` (알파 마스크), `resources/wordmark-source.png` (원본), `scripts/wordmark-mask.py` (재생성기)

**Interfaces:**
- Produces: `export function Wordmark({ width, className }: { width: number; className?: string })`

**자산은 왜 알파 마스크인가** — 원본은 흰 바탕에 검은 붓글씨다. 그대로 얹으면 어두운 배경
사진 위에서 글자가 사라지고 흰 사각형이 유리를 덮는다. 이 앱의 규칙은 "모든 글자는 100%
currentColor"(시각 스펙 §4.2)이므로, 잉크가 있는 자리만 알파로 남기고 색은 CSS 가 입힌다.
`mask-image` 로 씌우고 `bg-current` 로 칠하면 워드마크가 배경의 밝기를 따라 극성을 뒤집는다 —
글자와 같은 규칙 아래 놓인다.

**어디에 세우지 않는가 (그리고 왜)**

- **타이틀바에 두지 않는다.** `Titlebar.tsx` 의 주석이 명시한다: "띠 자체는 아무것도 그리지
  않는다 — 배경 사진 위에 얹히는 가구가 되지 않기 위해서다." 로고를 얹는 순간 그 결정이
  뒤집힌다. 이름을 항상 보이게 하는 것보다 배경을 가리지 않는 것이 이 제품의 성격이다.
- **앱 아이콘으로 쓰지 않는다.** 가로로 긴 붓글씨를 정사각 아이콘에 밀어 넣으면 뭉개진다.
  기존 `resources/icon.svg` 를 그대로 둔다.

- [ ] **Step 1: `Wordmark` 의 실패하는 테스트를 쓴다**

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Wordmark } from './wordmark'

describe('Wordmark', () => {
  it('색을 스스로 정하지 않는다 — 글자와 같은 규칙 아래 있다', () => {
    const html = renderToStaticMarkup(<Wordmark width={180} />)
    // 잉크는 currentColor 다. 이미지가 자기 색을 들고 오면 배경 위에서 규칙이 깨진다
    expect(html).toContain('bg-current')
    expect(html).not.toMatch(/text-(red|amber|yellow|orange|blue|green)-/)
    expect(html).not.toContain('<img')
  })

  it('마스크로 잉크 모양을 얻는다', () => {
    const html = renderToStaticMarkup(<Wordmark width={180} />)
    expect(html).toContain('mask-image')
    expect(html).toContain('wordmark')
  })

  it('원본 비율을 지킨다 — 붓글씨는 늘어나면 다른 글씨가 된다', () => {
    const html = renderToStaticMarkup(<Wordmark width={720} />)
    // 자산은 720x298 이다
    expect(html).toContain('width:720px')
    expect(html).toContain('height:298px')
  })

  it('사람이 읽는 이름을 남긴다 — 마스크는 스크린리더에 아무것도 아니다', () => {
    const html = renderToStaticMarkup(<Wordmark width={180} />)
    expect(html).toContain('Zetrem')
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test -- src/shared/ui/wordmark.test.tsx`
Expected: FAIL — `Failed to resolve import "./wordmark"`

- [ ] **Step 3: `wordmark.tsx` 를 쓴다**

```tsx
import wordmarkUrl from '@/shared/assets/wordmark.png'
import { cn } from '@/shared/lib/cn'

/** 자산의 실제 크기 (@2x). 비율을 코드가 알아야 늘어나지 않는다 */
const SOURCE = { width: 720, height: 298 }

/**
 * 붓글씨 이름표.
 *
 * `<img>` 가 아니라 마스크인 이유: 원본은 흰 바탕에 검은 글씨라 어두운 배경 위에서
 * 사라진다. 잉크 모양만 마스크로 쓰고 색은 currentColor 로 칠하면, 이름이 이 앱의
 * 다른 모든 글자와 같은 규칙 아래 놓인다 (시각 스펙 §4.2).
 */
export function Wordmark({ width, className }: { width: number; className?: string }) {
  const height = Math.round((width / SOURCE.width) * SOURCE.height)
  return (
    <span
      role="img"
      aria-label="Zetrem"
      title="Zetrem"
      className={cn('block flex-none bg-current', className)}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        maskImage: `url(${wordmarkUrl})`,
        WebkitMaskImage: `url(${wordmarkUrl})`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
      }}
    />
  )
}
```

TypeScript 가 `.png` import 를 모르면 `src/shared/assets/assets.d.ts` 에
`declare module '*.png' { const src: string; export default src }` 를 더한다.

- [ ] **Step 4: 통과를 확인한다**

Run: `npm test -- src/shared/ui/wordmark.test.tsx && npm run typecheck`
Expected: PASS

- [ ] **Step 5: 첫 실행 화면에 이름을 세운다** (`SetupPane.tsx`)

세 단계 카드 위, 가장 큰 자리다. 처음 켠 사람이 무엇을 켰는지 아는 순간이므로 여기서는
이름이 크게 서도 된다 (폭 200px 안팎, 불투명도는 그대로 — 이 화면에는 배경 사진과 겨룰
다른 글자가 없다).

- [ ] **Step 6: 대화의 첫 화면에 서명으로 남긴다** (`ConversationPane.tsx` 의 `turns.length === 0` 분기)

이미 설정을 마친 사람에게는 이 화면이 첫 화면이다. 다만 여기에는 `무엇을 맡길까요` 라는
세리프 표제가 이미 목소리를 갖고 있으므로, 워드마크는 그 위에 **작고 조용하게** 선다
(폭 100px 안팎, `opacity-40` 정도). 표제와 크기로 겨루면 화면에 주인이 둘이 된다.

대화가 시작된 뒤(`turns.length > 0`)에는 그리지 않는다 — 그때 화면의 주인은 에이전트의
말이다.

- [ ] **Step 7: 실기로 보고 고친다**

`npm run dev` 로 띄우고 Task 12 와 같은 방식으로 화면을 캡처한다. 두 화면(설정, 빈 대화)을
**밝은 배경과 어두운 배경 양쪽에서** 본다 — 마스크가 두 극성에서 모두 살아나는지는 실측으로만
확인된다. 크기·여백·불투명도는 이 캡처를 보고 정한다. 숫자를 먼저 정하고 화면을 맞추지 않는다.

캡처에서 드러난 문제만 고친다. 화면을 보지 않고 하는 손질은 이 태스크의 범위가 아니다.

- [ ] **Step 8: 전체 테스트·타입검사·커밋**

Run: `npm test && npm run typecheck`
Expected: PASS

```bash
git add src/shared/ui/ src/widgets/setup/ src/widgets/conversation/
git commit -m "feat: 워드마크 — 이름이 currentColor 로 선다

붓글씨를 알파 마스크로 씌워 배경의 밝기를 따라 극성이 뒤집히게 했다.
설정 화면에는 크게, 빈 대화에는 표제 위 작은 서명으로. 타이틀바에는
두지 않는다 — 그 띠는 아무것도 그리지 않기로 한 자리다."
```
