# 4회차 — 서브에이전트 타일 자동 확장

- 작성일: 2026-08-13

## 실측 (claude 2.1.229, --forward-subagent-text)

- 탄생: assistant 의 tool_use — 이름이 **Agent** (구버전 Task), `id` 가 자식의 열쇠,
  `input.description` 이 사람이 읽을 이름
- 말: `parent_tool_use_id` 가 붙은 assistant/user 메시지의 text 블록 (text·thinking 만 전달)
- 닫힘: 그 `tool_use_id` 의 tool_result. **모든 도구가 tool_result 를 내므로**
  어느 것이 자식의 것인지는 열림을 지켜본 러너가 Set 으로 가른다

## 설계

- 파서: `childOpen` / `childSay` / `childClosed`. parent 붙은 말은 부모의 층으로 새지 않는다
- 러너: `RunSink.child(event)` 로 수명을 흘린다. 부모 퇴장 시 열린 자식을 모두 닫는다
  (고아 타일은 영원히 working 으로 남는다)
- 셸: 자식 세션의 집도 sessionStore 다 (`{부모id}-c-{toolUseId}`). WorkspaceScreen 이
  "세션은 있는데 격자에 자리가 없는 타일"을 발견해 deck 의 `openOne` 으로 자리를 내준다.
  격자 재배치는 기존 물 문법 전환이 그대로 받는다 — 새 전환 코드 없음
- 자식이 닫히면(status done, outcome 없음) 기존 자동 닫힘 경로로 격자가 줄어든다
- 자식은 stdin 이 없다 — waiting 이 없으므로 답/권한/끝내기 창구도 없다

## 검증 (2026-08-13, CDP 실기)

"서브에이전트로 2+2에 답하게 해" → 격자 1→2 확장(자식 라벨 = Task description),
자식 닫힘 → 1로 복귀 → 끝내기 → 0. 스크린샷 확인.

## 백그라운드 자식 (2026-08-13, 사용자 보고로 발견)

증상: "뜨는 척 하다가 사라진다". 원인: 요즘 CLI 는 서브에이전트를 기본으로
`run_in_background: true` 로 띄우고, 그 경우 Agent tool_use 의 tool_result 가
**즉시**(접수증) 돌아온다 — 이걸 닫힘으로 읽으면 타일이 태어나자마자 죽는다.
실측: bg=true 에서 열림과 tool_result 가 같은 초에 왔고, 자식의 말은 그 뒤에도 왔다.

수정: childOpen 에 `background` 를 싣고, 백그라운드 자식은 tool_result 를 무시한다.
명시적 완료 신호가 없으므로 **부모의 턴이 끝날 때** 거둔다 — 최소한 띄운 턴 동안은
살아서 산출을 보여준다. 긴 백그라운드 작업이 턴을 넘겨 말하면 그 말은 버려진다 —
그때 다시 여는 것은 다음 회차의 일이다.

## 백그라운드 자식의 진짜 완료 신호 (2026-08-13, 2차 수정)

턴 종료에 거두는 휴리스틱은 오케스트레이터 패턴에서 틀린다 — 부모는 자식을 띄우고
**턴을 바로 접은 뒤** 알림을 기다리고, 자식의 말은 턴 경계를 넘어 계속 온다 (실측:
부모 턴 종료 13.3s, 자식 마지막 말 94.6s).

진짜 신호는 `system/task_notification` 이다 (실측):

```json
{"type":"system","subtype":"task_notification","task_id":"...","tool_use_id":"toolu_...",
 "status":"completed","summary":"4","usage":{...}}
```

- `tool_use_id` 가 자식의 열쇠와 일치한다 — 파서가 `childNotified` 로 번역
- `summary` 는 자식의 마지막 말로 남긴다
- 턴 종료로는 이제 아무 자식도 거두지 않는다. 부모 퇴장이 유일한 fallback

검증: CDP 실기 — 부모 waiting + 자식 working 이 24.8초 공존(요구사항의 그림),
자식은 알림에 닫히고 부모가 결과를 보고했다. `system/task_started` 도 존재한다
(description·prompt 포함) — childOpen 을 이것으로 바꾸는 선택지가 있다.

## 최소 체류시간과 실패 가시화 (2026-08-13, 화면 녹화로 발견)

녹화 실측: "서브에이전트 3개 띄워서 아무 계산이나 해줘" — 자식들이 몇 초 만에 끝나
타일이 1초 미만으로 번쩍이고 사라졌다. 번쩍이는 타일은 없는 것보다 나쁘다.

- `TILE_MIN_DWELL_MS = 4000` — 스스로 닫히는 타일(결과 없는 done)은 최소 4초는 산다.
  분할을 보고 이름과 마지막 말을 읽는 시간. 닫힘 판정은 초 시계(nowMs)가 다시 온다
- 실패한 자식(tool_result is_error)은 "실패 — <이유>" 를 마지막 말로 남기고 닫힌다 —
  조용히 사라지면 화면이 거짓말이 된다

검증: 같은 프롬프트에서 자식 타일 구간 수명 0.5초 → 8.2초, 받은 일감·이름이 읽힌다.

## 닫힘 규칙 최종형 + 자식의 2층 (2026-08-13, 3차)

- **run_in_background 는 생략이 기본이고, 생략해도 백그라운드다** — input 으로 fg/bg 를
  가르던 판정이 접수증 닫힘을 되살렸다 (실측: 타일 0.7초 사망). 그리고 전경 자식조차
  task_notification 을 낸다. 최종 규칙: **tool_result 는 닫힘이 아니다(에러 제외).
  닫힘은 알림(childNotified)과 부모 퇴장뿐이다.**
- **자식의 도구 활동(tool_use)도 parent 를 달고 전달된다** — 문서("text and thinking")와
  다르다 (실측: 조사 자식에서 38개). 파서가 `childStream` 으로 갈라 자식 타일의 2층에
  흘린다 — "무슨 일을 하는지" 가 화면의 핵심이다.

검증: 병렬 자식 2개가 80초간(28.9→107.8s) 부모와 공존, 알림에 닫힘. 자식 2층에
`Bash find …` 활동 줄 확인 (스크린샷).
