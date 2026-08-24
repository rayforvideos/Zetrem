# 분류 층 제거 — 폴더와 프로젝트를 1:1로

날짜: 2026-08-24
브랜치: beta.6

## 왜

사용자 피드백 문서("Zetrem UI 제안", 제안 06)는 사이드바를 2계층으로 요구한다:
프로젝트가 최상위이고 대화가 그 바로 아래에 놓이며, **프로젝트는 작업
폴더와 1:1로 매핑된다.**

구현은 3계층으로 흘렀다: `폴더 → 분류 → 대화`. 분류는 문서에 없는 층이고,
`같은 path를 가진 Project 레코드 복제`로 만들어져 1:1 매핑을 깼다. 관찰된
결함 대부분이 이 한 가지 선택에서 파생된다.

## 관찰된 결함

실행 중인 앱과 코드에서 확인한 것:

1. 분류를 만들면 새 분류가 `current`가 되어(`WorkspaceScreen.tsx:234-236`)
   빈 분류로 이동한다. 사용자에게는 대화 목록이 사라진 것으로 보인다.
2. `onBlur`가 곧 생성이다(`CategorySections.tsx:51-54`). 기본값이 취소가
   아니라 확정이라, 딴 곳을 클릭하면 의도 없이 분류가 생긴다.
3. 같은 이름을 다시 넣으면 `createProject`가 `openProject`로 빠져
   (`projects.ts:100-106`) 아무 일도 일어나지 않는다.
4. 입력 상태에 문맥이 없다. 버튼이 사라지고 테두리 없는 입력창만 남으며,
   확정·취소 방법이 화면에 없다.
5. 분류가 없는 폴더에는 divider가 렌더되지 않아 개념이 툴팁에만 존재한다.
6. `새 분류`가 `새 대화` 바로 아래 4px에 거의 같은 모양으로 놓여, 빈도가
   크게 다른 두 액션이 오타 거리에 있다.
7. `CategorySections.test.tsx`는 `renderToStaticMarkup` 정적 검사뿐이라
   입력의 커밋·취소·blur 동작이 전혀 덮이지 않는다.
8. 제거 확인창이 라벨을 두고 "폴더와 그 안의 모든 것은 디스크에 남습니다"
   라고 말한다. 라벨에 대해 할 말이 아니다.

## 범위

- **포함**: 분류 층 제거, 폴더=프로젝트 1:1 복원, 대화 저장소 마이그레이션,
  "File under" 제거.
- **제외**: 팀원을 프로젝트 소속으로 옮기는 것(제안 06의 나머지 절반).
  팀원은 `userData/agents` 한 곳에 전역으로 남는다.
- **제외**: 볼트(제안 07).

## 설계

### 1. 데이터 모델

불변식: **path 하나당 프로젝트 하나, `id === path`.**

이는 이미 레거시 규약이다. `seeded()`가 `id: path`로 만들고, 실제 저장분도
`id`가 경로다. 분류만 `randomUUID()`를 쓴다.

- `createProject(name, path)`: 같은 path에 프로젝트가 있으면 이름을 줘도
  항상 그것을 연다. "이름을 주는 것이 폴더를 쪼개는 방법"이라는 현재 규칙을
  제거한다.
- `renameProject`는 유지한다. 표시 이름은 폴더명과 달라도 된다 — 제안 06의
  `📦 출고 자동화`가 그 경우다.

### 2. 마이그레이션 (main, 시작 시, 멱등)

1. path별로 묶는다. 생존자는 `id === path`인 행이고, 없으면 그렇게 만든다.
2. 생존 이름: `id === path` 행의 이름, 없으면 `basename(path)`.
3. 대화 파일: 각 패자의 `sha256(id)` 디렉터리의 `*.json`을 `sha256(path)`
   디렉터리로 옮긴다. 같은 파일명이 이미 있으면 덮지 않고 건너뛴다. 비워진
   디렉터리는 삭제한다.
4. `current`가 패자였으면 생존자로 옮긴다.

분류를 쓰지 않은 폴더는 이미 `id === path`이므로 디렉터리가 그대로 있고
아무 파일도 움직이지 않는다.

### 3. UI

- `CategorySections` 삭제.
- `ProjectSwitcher`: path dedupe 루프 제거. **rename/remove 메뉴를 되돌린다**
  (아래 사이드이펙트 2). 목록에 `＋ 새 프로젝트`를 추가한다.
- `ChatList`: `fileTargets`/`onFile` prop과 "File under" 메뉴 제거.
- `use-transcript`: `move()` 삭제. 전용 IPC가 없고 read/write/forget 조합이라
  렌더러만 바뀐다.
- `WorkspaceScreen`: `fileTargets`/`onFile` 배선 제거(`:459-464`).

### 4. i18n

제거되는 문자열: `New category`, `Category name`, `Rename category`,
`More for {name}`, `Remove category`, `Remove {name}?`,
`The category leaves this list…`, `Zetrem's own filing inside this folder…`,
`File under`, `Could not move that chat`. `lingui extract`로 정리한다.

## 확인된 사이드이펙트

### 1. 분류는 대화 목록 말고는 아무것도 격리하지 않았다 (안심 요소)

`recallProject()`는 **경로**를 돌려주고, 런타임 전부가 그것을 쓴다:
에이전트 spawn cwd(`agent-host.ts:84`), `session-probe.ts:85,103`,
`plugins.ts`, `connectors.ts:67`, `attachments.ts:49`, `agent-defs.ts:19`.

따라서 같은 폴더의 두 분류는 cwd·플러그인·커넥터·첨부·authored agents를
모두 공유했다. 분류가 격리한 것은 `sha256(project id)` 대화 디렉터리 하나뿐이다.
**마이그레이션 대상은 정확히 그 하나다.**

### 2. rename/remove가 사라진다 — 반드시 되돌려야 한다

`15ab33c`가 rename/remove 메뉴를 `ProjectSwitcher`에서 `CategorySections`로
옮겼다. 지금 프로젝트 이름 변경과 제거는 **분류 divider에만 있다.**
`CategorySections`를 지우면 두 기능이 함께 사라진다.

대응: `38c4b00` 시점의 `ProjectSwitcher` 메뉴(⋯ → Rename / Remove + AlertDialog)를
프로젝트 행으로 되돌린다. 그리고 `tests/conventions/design-tokens.test.ts:7`의
`REVEALED_ON_HOVER`를 `CategorySections` → `ProjectSwitcher`로 되돌린다.

### 3. CHAT_CAP 60 + 매 저장마다 prune → 병합 시 조용한 유실

`prune()`은 `transcript:write`마다 돌고(`transcript-store.ts:115`), mtime 기준으로
`CHAT_CAP`(60) 초과분을 **삭제한다**. 분류 3개가 각 30개면 병합 후 90개가 되고,
다음 자동저장이 오래된 30개를 조용히 지운다. `transcript:list`도 이미
`.slice(0, CHAT_CAP)`이라 초과분은 보이지도 않는다.

대응: 마이그레이션이 병합 결과를 세고, `CHAT_CAP`을 넘으면 초과분을 **삭제하지
않고** `folder/overflow/`로 옮긴 뒤 무엇을 옮겼는지 로그를 남긴다. 지우는 결정은
사용자 것이고, 마이그레이션이 대신 내릴 결정이 아니다.

### 4. 이름만으로 만드는 프로젝트가 붕괴한다

`handleCreateProject`는 열린 프로젝트가 없으면 path에 `''`를 넘기고
(`WorkspaceScreen.tsx:234`), `workspaceDir(null, …)`은 **모든 이름에 대해 같은**
`userData/agent-workspace`를 돌려준다. 1:1 아래에서는 두 번째 이름이 첫 번째를
조용히 다시 열게 된다 — `e33a50c`("타이핑한 이름이 프로젝트가 된다")의 회귀다.

대응: 이름만 주어진 경우 `agent-workspace/<안전한 이름>` 하위 폴더를 만들어
그것을 path로 쓴다. 1:1이 유지되고 e33a50c의 의도도 남는다.

### 5. 환영 화면의 최근 목록 (조치 없음)

`WorkspaceScreen.tsx:326`의 `recent`는 지금 분류를 각각 다른 항목으로 보여준다.
1:1 이후에는 폴더 단위가 된다. 개선이므로 별도 조치는 없다.

## 테스트

TDD로 먼저 쓴다.

신규 — `projects.ts` 마이그레이션:
- 같은 path의 분류 2개가 하나로 합쳐지고 **대화가 전부 살아남는다**
- 이미 1:1이면 아무것도 바뀌지 않는다 (멱등)
- `current`가 패자면 생존자로 옮겨진다
- 대상 디렉터리에 같은 파일명이 있으면 덮지 않는다
- 병합 결과가 `CHAT_CAP`을 넘으면 초과분이 `overflow/`로 가고 삭제되지 않는다

신규 — `createProject`:
- 같은 path에 두 번째 프로젝트를 만들지 않는다 (이름을 줘도)
- 이름만 주면 `agent-workspace/<이름>` 하위 폴더에 만든다

수정:
- `CategorySections.test.tsx` 삭제
- `ProjectSwitcher.test.tsx`에 rename/remove 기대 복원
- `TeamSidebar.test.tsx`, `ChatList` 테스트에서 분류·File under 기대 제거
- `design-tokens.test.ts`의 `REVEALED_ON_HOVER` 되돌림

완료 조건: 기존 1855개 통과 유지 + `npm run typecheck` 무에러 + 실행 중인 앱
스크린샷으로 사이드바 확인.

## 커밋 방식

브랜치가 이미 push되어 있으므로 revert가 아니라 전진 커밋으로 처리한다.
`4a4235c`, `38c4b00`, `15ab33c`가 넣은 분류 층을 걷어내는 변경이다.
