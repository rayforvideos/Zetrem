# 주석 정리 보고서

## 요약

- 시작 시점(HEAD `ce6f513`, 브랜치 `feat/status-surface`) 기준, 스크립트 집계로 코드 전체의 주석 줄은
  **1340줄 / 9864줄** (약 13.6%, 팀장이 제시한 1208/6293·19%와는 집계 도구가 달라 절대값은 다르지만 방향은 같음).
- 작업 완료 후(내가 손댄 파일 범위 기준) **455줄 / 8927줄**로 줄었다 — 약 66% 감소.
  (참고: 작업 중 다른 에이전트가 병행 커밋한 `tool-shape.ts`·`ToolIcon.tsx`·`ToolLine.tsx`·`tool-shape.test.ts` 4개 신규
  파일은 이번 스코프 밖이라 손대지 않았다. 이 파일들의 주석 11줄/319줄은 위 "이후" 수치에서 제외했다.)
- 커밋 6개: `entities` → `widgets` → `pages/workspace` → `electron·shared` → `tests` → 포맷 되돌림(자체 발견 실수 수정).
- 각 그룹 뒤 `npx tsc --noEmit` 실행, 최종적으로 `npm test`(32 files / 330 tests 통과) · `npm run build`(main·preload·renderer 모두 성공) 확인.
- 작업 도중 자체 점검 스크립트로 "커밋 6개의 모든 변경 줄이 정말로 주석뿐인가"를 재확인했다(주석/블록주석을 걷어내고 남은 코드 토큰을 정규화해 비교). 그 과정에서 `StatusBar.tsx`의 삼항 연산자 줄바꿈이 주석 제거 중 실수로 한 줄에 합쳐진 것을 발견해 별도 수정 커밋(`5ad8f8d`)으로 원래 줄바꿈을 복원했다. 그 외에는 모두 주석(JSX `{/* */}` 포함) 줄만 바뀌었음을 확인했다.

## 커밋

1. `ed5dc37` — entities (agent-session·glass·project)
2. `2e864cf` — widgets (conversation·tile-deck·status-bar·titlebar·setup)
3. `a642a70` — pages/workspace
4. `b63e0d3` — electron·shared
5. `19094ef` — tests
6. `5ad8f8d` — 자체 발견한 포맷 되돌림 수정 (StatusBar.tsx)

## KEEP한 사실들 (파일 : 남긴 한 줄)

**측정값 (measured)**
- `entities/agent-session/api/claude/status.ts` — `costUsd`는 세션 누적, 턴 차액은 스토어가 뺀다 (실측 0.125331→0.166547)
- `entities/agent-session/api/claude/status.ts` — 컨텍스트 = input+cache_read+cache_creation, 다음 턴 cache_read와 일치
- `entities/agent-session/api/claude/status.ts` — `resetsAt`은 epoch **초** (ms로 변환해서 씀)
- `entities/agent-session/api/claude/child.ts` / `pages/workspace/model/agent-events.ts` — Agent 도구의 `tool_result`는 완료가 아니라 접수증 (실측: 열림 02:00:03.867 → 결과 02:00:03.964)
- `entities/agent-session/api/claude/turn.ts` — 부분 메시지 델타 뒤에 같은 텍스트의 확정 메시지가 또 온다
- `widgets/tile-deck/ui/AgentTile.tsx` — `will-change: opacity`는 backdrop root를 만들어 `backdrop-filter`가 바깥을 못 읽는다 (실측 인접 픽셀 점프: 2 vs 92)
- `widgets/tile-deck/ui/layers/Telemetry.tsx` — 실측: 텔레메트리 위치를 아래로 바꾸면 명령줄 위에 숫자가 포갰다
- `widgets/tile-deck/ui/layers/Stream.tsx` — 2층 밝기 60%→70% (실사용 피드백, 줄 수는 14→10로 보정)
- `entities/agent-session/model/persona.ts` — 137.508(황금각)로 색상환을 흩는다
- `shared/lib/shell-env.ts` — 허용목록 방식 채택 이유: 금지목록이었을 때 Orca 셸의 `ORCA_*` 19개가 새서 Orca 알림이 떴다 (사용자 보고)
- `electron/login-path.ts` — `-l`만 주면 `.zprofile`만 읽어 nvm·pyenv·전역 npm이 빠진다 (실측: "claude 명령을 찾지 못했습니다")
- `electron/cli-version.ts` — `claude update`에는 dry-run이 없다 (실측: 옵션이 `-h`뿐)

**트랩 (제거하면 깨짐)**
- `entities/agent-session/model/run-config.ts` — `--dangerously-skip-permissions`와 `--permission-prompt-tool`은 함께 줄 수 없다
- `electron.vite.config.ts` — 샌드박스 렌더러는 ESM preload를 로드하지 않는다 → preload는 CJS
- `entities/agent-session/model/status-store.ts` — reset 시 `update`만 남긴다 (비용을 안 지우면 `max(0,작은값-큰값)=0`으로 $가 말없이 빠짐)
- `entities/glass/ui/GlassPane.tsx` — `backdrop-filter`는 자기보다 먼저 그려진 것만 샘플링 (behind는 블러 뒤에)
- `widgets/tile-deck/model/deck-machine.ts` — `closing`을 즉시 지우면 타일이 같은 커밋에 언마운트돼 닫힘 연출이 존재할 수 없다
- `electron/agent-host.ts` — `'starting'` 자리표시가 없으면 spawn 전 stop이 무시돼 고아 프로세스가 된다

**외부 계약 / cross-file 불변식**
- `widgets/conversation/ui/Markdown.tsx` — react-markdown v10은 `li`에 `ordered` 여부를 안 넘긴다
- `widgets/conversation/ui/Markdown.tsx` — 원시 HTML은 그리지 않는다 (입력이 모델 출력이라 태그 허용 시 화면 구조를 모델이 쓸 수 있음)
- `shared/config/theme.ts` — `GROUND`와 `global.css`의 `--zt-ground`는 같은 값을 유지해야 한다
- `pages/workspace/model/agent-events.ts` — `child.ts`의 `childSays`는 `tool_result`를 안 보므로 여기 오는 `toolResult`는 전부 부모 층 것
- `entities/agent-session/api/claude/permission.ts` — `PermissionResult`는 CLI의 `can_use_tool` 응답 계약 (allow는 updatedInput 필수)

## 확신이 서지 않았던 부분

- `electron/main.ts`의 `requestSingleInstanceLock` 주석: 원문이 "두 번째 인스턴스의 sweep이 첫 인스턴스의 worktree를 지울 수 있다"였는데, `agent-host.ts`의 다른 주석(이번에 지운 것)에 "worktree 격리는 걷어냈다"는 기록이 있어 이 worktree 언급이 이미 죽은 기능을 가리키는 것으로 보였다. 사실을 지어내지 않으려고 "두 인스턴스가 같은 userData 파일(설정·프로젝트 기억 등)을 동시에 쓸 수 있다"는 더 안전하고 일반적인 문구로 바꿨다. **다만 이 lock을 처음 넣은 실제 이유(리뷰 Important 6)가 지금도 유효한지, worktree 관련 사유가 완전히 사라졌는지는 코드만으로 확정할 수 없었다** — PR 히스토리를 아는 사람이 한 번 더 봐주면 좋겠다.
- 일부 파일(`ConversationPane.tsx`의 tickOpen 관련, `ToolDetail.tsx`)에서 같은 사실(예: "결과가 뒤늦게 온다")이 타입 정의·구현부·테스트 세 곳에 조금씩 다른 표현으로 중복돼 있었다. 하나만 남기고 나머지는 지웠는데, 어느 자리에 남기는 게 가장 적절한지는 판단이 갈릴 수 있다.

## 코드는 건드리지 않았지만 눈에 띈 것 (수정하지 않음)

- `entities/agent-session/api/runner.ts`의 원래 헤더 주석이 "러너가 알아야 할 것은 이 다섯뿐"이라고 했는데 `RunSink` 타입은 실제로 8개 메서드를 갖고 있었다 — 주석이 이미 코드와 어긋나 있었다. 주석 자체를 지웠으므로 더는 거짓말을 하지 않지만, 원래 설계 의도(다섯 개로 유지하려 했던 것)가 왜 여덟 개로 늘었는지는 확인하지 못했다.
- 위 `electron/main.ts`의 worktree 관련 불확실성(위 항목 참고).

## 검증

- 각 커밋 뒤 `npx tsc --noEmit -p .` — 항상 클린.
- 최종 `npm test` — 32 files / 330 tests 모두 통과.
- 최종 `npm run build` — main·preload·renderer 모두 성공.
- 자체 스크립트로 6개 커밋의 모든 diff 줄을 주석/공백 제거 후 정규화해 전후 비교 — `5ad8f8d` 수정 이후 코드 토큰 차이 0건.
