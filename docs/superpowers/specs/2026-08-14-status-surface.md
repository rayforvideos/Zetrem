# 7회차 — TUI 가 아는 것을 우리 화면이 전부 안다

- 작성일: 2026-08-14
- 전제: 사람은 CLI 의 TUI 를 보지 않는다 (6회차). **그래서 TUI 가 알려주던 것을 우리가 다 져야 한다.**

## 왜

6회차에서 화면을 우리 것으로 가져오며 얻은 것은 문법이고, 잃은 것은 **정보**다. TUI 는
상태줄·환영 박스·`/status`·`/mcp`·자동 갱신 배너로 사람에게 계속 말을 걸고 있었다. 우리
화면은 점 하나·권한 칩·모델 칩이 전부다. 그 사이에 빠진 것을 실측으로 목록화하고 전부 얹는다.

이번 회차의 정의: **엔진이 말하는 것 중 사람에게 필요한 것은 하나도 버리지 않는다.**

## 실측 — CLI 가 주는데 우리가 안 받는 것 (claude 2.1.231, stream-json 한 세션)

| 정보 | 출처 |
|---|---|
| 세션 신원 | `system/init` — `session_id` `cwd` `model`(`claude-opus-5[1m]`) `permissionMode` `output_style` `apiKeySource` `claude_code_version` `fast_mode_state`(+`fast_mode_disabled_reason`) `memory_paths` |
| 연결·능력 | `init.mcp_servers` (8개, `connected`/`pending`/**`needs-auth`**), `tools` 62, `slash_commands` 65, `agents` `skills` `plugins` |
| 사용량 한도 | `rate_limit_event` — `{status: allowed_warning, rateLimitType: seven_day, utilization: 0.28, resetsAt: epoch초, isUsingOverage}` |
| 계기 | `result` — `total_cost_usd` `duration_ms` `ttft_ms` `num_turns` `usage`(cache read/creation 분리) `modelUsage[…].contextWindow` `api_error_status` `stop_reason` `terminal_reason` `permission_denials` |
| 훅 | `system/hook_started` · `hook_response` — `hook_name` `hook_event` `exit_code` `stdout` `stderr` |
| 진행 | `system/status`(`requesting`), `stream_event`(토큰 단위 델타) |
| 압축 | `system/compact_boundary` |
| 도구 결과 | `user.tool_use_result` — `stdout` `stderr` `interrupted` (지금 화면엔 도구 이름·대상만) |
| 생각 | thinking 블록 (`usage.output_tokens_details.thinking_tokens`) |
| 업데이트 | **stream-json 에 없다.** `init.claude_code_version` 이 현재 버전, 최신 여부는 우리가 물어야 한다 |

지금 파서가 이미 `meter`(토큰) 이벤트를 만들지만 `use-agent.ts` 는 그것을 **버린다** — 화면에
담을 자리가 없어서다. 자리를 먼저 만든다.

## 실측이 정한 세 가지

세 값 모두 설계를 바꾸므로 2턴 세션으로 직접 확인했다.

1. **비용은 세션 누적이다.** `total_cost_usd` 0.125331 → 0.166547. 반면 `num_turns` 는 턴마다
   1 로 돌아온다. → 상태줄은 세션 총액을 들고, 대화의 턴 끝 줄은 **차액**을 쓴다.
2. **컨텍스트는 `result` 를 기다리지 않아도 된다.** 매 `assistant` 의
   `usage.input + cache_read + cache_creation` = 28,364 이고, **다음 턴의 `cache_read` 가
   28,362** — 일치한다. 이것이 살아 있는 컨텍스트 계기다. 분모 `contextWindow`(1,000,000)는
   첫 `result` 에서 온다. 그전에는 절대값만 쓰고 % 는 띄우지 않는다 (모르면 그리지 않는다 —
   6회차의 설정 로딩 원칙).
3. **partial 은 초안이고 `assistant` 가 확정본이다.** `DELTA '1'` 뒤에 완성된 `assistant '1'`
   이 또 온다. 이어붙이면 같은 문장이 두 번 뜬다.

## 구조 — 파서를 셋으로 쪼갠다

`api/claude/parse.ts` 는 이미 260줄로 대화·자식·권한을 다 진다. 여기에 상태 10종을 더하면
한 파일이 500줄을 넘는다. `entities/agent-session/api/claude/` 아래로 가른다:

| 파일 | 무엇을 번역하나 |
|---|---|
| `turn.ts` | `assistant` 의 text·tool_use, **thinking**, `user` 의 **tool_result**(stdout/stderr/interrupted) → 대화의 층 |
| `status.ts` | `init` · `system/status` · `rate_limit_event` · `hook_*` · `compact_boundary` · `result` 의 계기판 → 상태의 층 |
| `child.ts` | `parent_tool_use_id` 가 붙은 것 (지금 로직 이동) |
| `permission.ts` | `control_request` 와 응답 만들기 (지금 로직 이동) |
| `index.ts` | `parseClaudeLine` 이 셋에 차례로 묻고 합친다. `TurnEvent \| StatusEvent \| ChildEvent` 유니온 |

전부 순수 함수 그대로다 — CLI 없이 테스트된다는 지금의 미덕이 이 회차의 안전망이다.

## 상태의 층 — `statusStore` (conversation 의 형제)

`entities/agent-session/model/status-store.ts`. "마지막으로 알려진 진실" 하나를 든다.
`null` 은 **아직 모른다**는 뜻이고, 모르는 것은 화면에 자리를 만들지 않는다.

```
session  { id, cwd, model, permissionMode, outputStyle, cliVersion, apiKeySource, fastMode } | null
context  { used, window: number | null }
cost     { usd, tokens: {in, out, cacheRead, cacheCreate}, durationMs, ttftMs, turns }
limit    { type, utilization, resetsAt, overage } | null
mcp      [{ name, status }]
counts   { tools, commands, agents, skills, plugins }
hooks    [최근 5개 { name, event, exitCode, ms }]
update   { current, latest: string | null, managedBy: string | null } | null
activity 'requesting' | 'idle'
```

사건(한도 경고가 떴다·여기서 압축됐다·API 오류)은 상태가 아니라 **대화**로 간다 — 지속하는
값은 상태줄에, 일어난 일은 그 지점의 대화에 남는다. 그래야 나중에 올려보면 언제 일어난
일인지 보인다.

## 업데이트 — 읽기는 레지스트리, 설치는 사람

`electron/cli-version.ts`.

- `claude update` 는 dry-run 이 없다 (실측: 옵션이 `-h` 뿐). npm 설치 환경에서는 물었을 뿐인데
  **설치까지 해버린다** — 도는 세션 뒤에서 엔진이 바뀌는 일은 있어서는 안 된다
- 그래서 읽기는 `registry.npmjs.org` 의 latest 조회와 `init.claude_code_version` 비교로만
  한다 (실측: 둘 다 2.1.231). 앱 시작 때 한 번, 이후 서랍에서 사람이 새로고침할 때
- 사람이 버튼을 누르면 `claude update` 를 돌리고 **그 stdout 을 그대로** 보여준다. 이 환경처럼
  Homebrew 가 관리하면 CLI 가 직접 "Claude is managed by Homebrew" 라 말한다
- 그 경우 `brew upgrade --cask claude-code@latest` 를 **띄워만 준다.** 시스템 패키지 관리자를
  앱이 대신 돌리는 것은 선을 넘는 일이다

## 화면 — 상태줄과 서랍

`widgets/status-bar`. 작성창 아래, 유리 위. 고정폭 10.5px, 색은 들이지 않는다 (§4.2: 글자는
100% currentColor, 알파는 선에만).

```
컨텍스트 91%  ·  $0.19  ·  7일 28%  ·  MCP 2/8  ·  2.1.231            ▴
```

- **모르는 칸은 비워두지 않고 아예 없다.** 왼쪽으로 모이고 서랍 손잡이만 오른쪽에 고정되어,
  값이 하나씩 채워질 때 줄이 흔들리지 않는다
- 경고 상태의 칸만 **문장으로 부푼다**: `7일 한도 28% — 금 05:00 초기화`,
  `MCP 5개 인증 필요`, `컨텍스트 88% — 곧 압축됩니다`. 색이 아니라 어절과 선 굵기로 말한다
- 컨텍스트는 85% 에서 부푼다 (압축 임박이 사람이 손쓸 수 있는 마지막 지점이다)

**서랍** — 누르면 상태줄이 밀려 올라가고 아래에서 명세가 오른다 (물 문법의 전환, ≤40vh 스크롤).
제목 없이 네 묶음:

1. **세션** — id 8자(눌러 복사) · cwd · 실모델 `claude-opus-5[1m]` · 권한 모드 · output_style ·
   fast mode(꺼졌으면 이유까지)
2. **계기** — 토큰 4종(캐시읽기/캐시생성/입력/출력, tabular-nums) · 컨텍스트 used/window ·
   세션 비용 · 턴 수 · 응답 시작까지(ttft)
3. **연결** — MCP 8줄(이름 + 상태, `needs-auth` 는 그 줄이 굵다) · 도구 62 · 명령 65 ·
   에이전트·스킬·플러그인 수
4. **환경** — CLI 버전 + 최신 여부 + 관리 주체(+ 갱신 버튼) · memory_paths · 최근 훅 5개
   (`SessionStart:startup  0  12ms`)

## 화면 — 대화 안쪽 넷

- **토큰 단위 스트리밍** (`--include-partial-messages`). 턴에 `draft` 자리를 따로 둔다. 델타는
  draft 에 쌓이고, 확정 `assistant` text 가 오면 draft 를 비우고 갈아끼운다 — 같은 문장이 두 번
  뜨는 것을 이 교체가 막는다 (실측 3). draft 끝에 커서 한 칸이 선다
- **생각** — 작업 레일 안쪽, 세리프 이탤릭 13px, 기본 접힘 (`생각 3문단 ▾`). 에이전트의 말과
  같은 활자족이면서 기울기로 갈라진다 — 읽으라고 있는 문장이지만 결론은 아니다
- **도구 결과** — 눈금 줄을 누르면 그 아래 고정폭 출력이 열린다. `is_error` 면 기본 펼침
  (실패는 이유가 화면에 있어야 한다). 40줄 상한 + `더 있음`, stderr 는 별도 줄
- **도구 전용 렌더** — `Edit`·`Write`·`MultiEdit` 는 +/- diff (문맥 3줄), `TodoWrite` 는
  체크리스트. 진행 중인 항목 하나만 맥동한다 — 작업 레일의 문법을 그대로 재사용한다

## 검증 (2026-08-14)

`npm run build` 은 세 타깃 모두 통과하고, `npm run dev` 는 main·preload 를 빌드하고 렌더러
서버를 띄운 뒤 Electron 을 기동한다 — 오류 없음. 단위 테스트는 333개.

**화면은 실제로 렌더해서 봤다.** 다만 CDP 가 아니라 임시 하네스로 봤다: 이 저장소에 원격
디버깅 포트가 배선돼 있지 않고, macOS 화면 자동화 권한을 그 시점에 받을 수 없었다. 그래서
진짜 컴포넌트와 진짜 CSS 를 mock 상태와 함께 브라우저에 띄워 캡처했다 (하네스 파일은 남기지
않았다). 유리 틴트 계산과 `backdrop-filter` 가 그대로 돌므로 배치·극성·활자·여백은 실물이다.

확인된 것:

- **워드마크가 두 극성에서 뒤집힌다** — 어두운 배경 위에서는 밝은 유리에 검은 잉크,
  밝은 배경 위에서는 어두운 유리에 흰 잉크. 마스크로 만든 이유가 여기서 값을 했다
- 상태줄 다섯 칸이 실제 값으로 서고, 경고 칸만 테두리와 긴 어절로 부푼다 (색은 없다)
- 서랍의 네 묶음이 전부 서고 `인증 필요` 가 굵기만으로 드러난다
- 생각은 `생각 2문단 ▾` 으로 접히고, **실패한 도구는 기본 펼침**으로 stderr 를 보인다
- 초안의 커서가 세리프 줄 안에 서고, 작업 레일이 에이전트 차례 왼쪽에 흐른다

**보고 나서야 드러난 두 가지 (고쳤다):**

- 서랍을 열면 대화가 통째로 밀려났다. `40vh` 는 뷰포트 기준인데 서랍은 그보다 짧은 판 안에
  산다 — 스펙의 "40vh 를 넘지 않는다" 는 화면을 삼키지 말라는 뜻이었고, 재는 상자를 잘못
  고르면 그 뜻이 그대로 무너진다. `min(40vh, 340px)` 로 바꿨다
- 초기화 시각이 `8. 20. 오전 06:00` 으로 나왔다. 게다가 같은 값을 상태줄과 대화 줄이 **따로**
  포맷하고 있었다 — 순수 함수 하나(`shared/lib/datetime.ts`)로 합치고 `8월 20일 06:00` 로 고쳤다

## 아직 확인하지 않은 것

살아 있는 세션으로는 검증하지 못했다. 즉 다음은 단위 테스트만 덮고 있고 실물로 본 적이 없다:

- 실제 stream-json 이 흐를 때 상태줄의 값이 채워지는 과정 (줄이 흔들리지 않는지)
- 글자가 실제로 흘러 들어오는 모습과, 확정된 뒤 같은 문장이 두 번 뜨지 않는지
- 한도 경고가 실제로 도착했을 때 대화 한 줄과 상태줄 부풂이 함께 나타나는지
- 갱신 버튼이 CLI 의 말을 그대로 옮기는지 (Homebrew 가 관리한다는 안내 포함)
- `compact_boundary` 가 실제 압축에서 어떤 선택 필드를 채우는지 (2026-08-14 노트 참고)

다음 회차에 이걸 하려면 원격 디버깅 포트를 개발 모드에 배선해 두는 편이 낫다 — 매 회차
같은 자리에서 막힌다.

## 열어둔 것

- **thinking 이 확정 `assistant` 에도 오는지** 는 이 회차에서 확인되지 않았다 (실측 세션에
  thinking_tokens 가 0 이었다). `stream_event` 로만 온다면 draft 교체 규칙을 thinking 에는
  적용하지 않는다 — 구현 첫 단계에서 실측으로 가른다
- `compact_boundary` 의 실제 필드 모양도 같은 자리에서 확인한다 (바이너리에 문자열은 있으나
  이번 세션에서는 압축이 일어나지 않았다)
