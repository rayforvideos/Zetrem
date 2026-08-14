# 2회차 — 실제 러너·응답·배경 저장

- 작성일: 2026-08-13
- 전제: 1회차 유리 타일 셸 (스펙 2026-08-12) 위에 얹는다. 셸은 수정하지 않는 것이 원칙.

## 설계 카드

**도메인** 실제 코딩 에이전트 세션
**변화 축** 에이전트 CLI 종류 = 늘어남(우리가) / 이벤트→화면 3층 매핑 = 고정

### 흐름

1. 렌더러가 `runners.claude.start(prompt, sink)` 호출
2. 렌더러는 프로세스를 못 띄우므로(샌드박스) **메인 프로세스가 CLI 를 spawn** 하고
   stdout 의 stream-json 을 줄 단위로 렌더러에 push
3. 렌더러의 어댑터가 JSON 이벤트를 도메인 이벤트(RunSink)로 번역
4. 턴이 끝나면(`result` 이벤트) 프로세스는 살아 있고 다음 입력을 기다린다 → **이것이 `waiting`**
5. 사용자가 대기 타일에 답하면 stdin 으로 user 메시지를 밀어 넣는다 → `working` 복귀
6. 프로세스 종료 → `done`

### CLI 계약 (Claude Code headless)

```
claude -p --input-format stream-json --output-format stream-json --verbose
```

- `assistant` 이벤트의 text 블록 → 1층 headline
- `assistant` 이벤트의 tool_use 블록 → 2층 stream 라인 (`도구명 대상`)
- `result` 이벤트 → 3층 meter(usage 토큰 누적) + status `waiting`
- stdin 입력: `{"type":"user","message":{"role":"user","content":[{"type":"text","text":...}]}}`

### 역할

- **계약** `AgentEvent` — 메인→렌더러로 건너가는 것 (`stdout-line` | `exit`)
- **캡슐화** `electron/agent-host.ts` — spawn·stdin·kill. 메인 프로세스 소유
- **캡슐화(IPC)** preload 에 이름 붙인 넷: `startAgent` · `sendToAgent` · `stopAgent` · `onAgentEvent`
- **구현** `runners/claude.ts` — stream-json → RunSink 번역
- **순수 파서** `api/claude/parse.ts` — JSON 라인 1개 → 도메인 이벤트. **프레임워크·IPC 무지, TDD 대상**
- **계약 확장** `RunHandle.send?(text)` — 답할 수 있는 러너만 구현. fake 도 구현해 데모 유지

### 응답 UI

- `waiting` 타일에 입력창 하나. 시선 규칙과 정합: 입력창은 **attention 타일에만** 렌더
- 전송하면 `useFleet` 이 보관한 handle 의 `send(text)` 호출, 낙관적으로 `working` 패치

### 배경 저장

- 메인 프로세스가 마지막 배경 **경로** 를 userData 의 JSON 에 기억
- 앱 시작 시 `backdrop:restore` 가 그 경로를 다시 읽어 bytes 를 돌려준다 (같은 bytes-over-IPC 경로 재사용)
- 파일이 사라졌으면 조용히 null — 폴백 그라디언트로 시작하면 된다. 단 콘솔에는 남긴다

### 다음 변화

- 다른 CLI(codex 등) 추가 = `runners/<id>.ts` + `parse` 짝 1개 + 등록 1줄. agent-host 는 무수정
- 이벤트 매핑 변경 = parse.ts 한 곳

### 하지 않는 것

- 권한 프롬프트 중계(§7 의 나머지), 멀티턴 히스토리 UI, worktree 격리 — 다음 회차
