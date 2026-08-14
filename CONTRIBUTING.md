# Contributing to Zetrem

Rules here are enforced by tests in `tests/conventions/`. If you break one,
`npm test` tells you which and where. Nothing in this file is a matter of taste
that only a reviewer knows.

```bash
npm run dev        # run the app
npm test           # unit tests plus the convention guards
npm run typecheck
npm run build
```

## Layout

Feature-Sliced Design. Layers lean one way only — a layer may import from the
layers below it, never above.

```
src/app        composition root, the IPC contract with the main process
src/pages      screens and the state that belongs to a screen
src/widgets    composed blocks a page arranges
src/entities   domain concepts and the UI that renders them
src/shared     things with no domain knowledge
electron       main process
tests          repo-wide convention guards
```

`src/shared/ui/` belongs to the shadcn CLI — `npx shadcn@latest add` writes
there. Do not hand-edit those files beyond what a diff review would accept, and
do not put your own components among them: a component that imports from
`@/entities`, `@/widgets`, `@/pages` or `@/app` is not shared, it belongs beside
the thing it knows about. Ours live in `src/shared/graphics/` (marks and icons)
or in an entity's own `ui/` folder.

## Tests live with their module

A module that has a test gets its own folder, named after the module. The file
names do not change.

```
shared/lib/units/units.ts
shared/lib/units/units.test.ts
shared/lib/cn.ts               ← no test, no folder
```

A module may have more than one test file in that folder. Tests that guard a
repo-wide rule rather than a single module go in `tests/conventions/`.

## Types live apart from logic

A module's types go in `<module>.types.ts`, next to the module. The logic file
imports what it needs; it does not re-export them. Consumers take types from the
entity barrel, which points at the `.types` file — so code that only needs a
shape never depends on the implementation.

```
shared/lib/tool-shape/tool-shape.types.ts   ToolShape
shared/lib/tool-shape/tool-shape.ts         toolShape()
shared/lib/tool-shape/tool-shape.test.ts
```

A `.types.ts` file exports no values. Deleting it must not change what runs.

Model with unions, not optional flags. `AuthStatus` is
`signed-in | signed-out | cli-missing`, not a record with four maybe-fields, so
a signed-out account cannot carry an email. When you add a variant the compiler
lists every place that has to handle it.

## Code

**No comments.** Names and tests carry the intent. The one exception is a
directive the toolchain reads (`@ts-expect-error`, `eslint-disable`).

**Switch over repeated type checks.** Three or more comparisons against the same
discriminant become a `switch`, so TypeScript can see which cases are covered
and a new variant fails to compile instead of falling through silently.

**Do not draw what you do not know.** A value the engine never sent is not a
zero and not a dash — the row does not exist. A failure is shown with its
reason, never swallowed into a state that looks like success.

**Semantic tokens, not hand-carved values.** No `text-[13px]`, no bare
`opacity-45`, no palette colours. Tailwind's scale and the shadcn tokens hold
the ruler. Agent faces are the one place colour is allowed.

## Commits

Subject in English, body in English then Korean, separated by `—— 한국어 ——`.
Say why, not what — the diff already says what.

```
feat: let the person change accounts

There was a way in and no way out...

—— 한국어 ——

계정을 바꿀 수 있게 한다

들어오는 길만 있고 나가는 길이 없어서...
```

---

# Zetrem 에 기여하기

여기 적힌 규칙은 `tests/conventions/` 의 테스트가 지킨다. 어기면 `npm test` 가
무엇을 어디서 어겼는지 말한다. 리뷰어만 아는 취향은 이 문서에 없다.

## 폴더

Feature-Sliced Design. 레이어는 한 방향으로만 기댄다 — 아래 레이어를 가져다 쓸 수
있지만 위 레이어는 모른다.

```
src/app        조립 지점, 메인 프로세스와의 IPC 계약
src/pages      화면과 그 화면에 속한 상태
src/widgets    페이지가 배치하는 덩어리
src/entities   도메인 개념과 그것을 그리는 UI
src/shared     도메인을 모르는 것들
electron       메인 프로세스
tests          저장소 전체 규약 가드
```

`src/shared/ui/` 는 shadcn CLI 의 자리다 — `npx shadcn@latest add` 가 여기에
쓴다. 우리 컴포넌트를 그 사이에 두지 않는다. `@/entities`·`@/widgets`·`@/pages`·
`@/app` 을 import 하는 컴포넌트는 shared 가 아니라 그 도메인 곁에 있어야 한다.
우리 것은 `src/shared/graphics/`(마크·아이콘)나 해당 엔티티의 `ui/` 에 둔다.

## 테스트는 제 모듈과 같이 산다

테스트가 있는 모듈은 제 이름의 폴더를 갖는다. 파일명은 바꾸지 않는다.

```
shared/lib/units/units.ts
shared/lib/units/units.test.ts
shared/lib/cn.ts               ← 테스트 없으면 폴더도 없다
```

한 모듈이 테스트 파일을 여럿 가질 수 있다. 특정 모듈이 아니라 저장소 전체 규약을
지키는 테스트는 `tests/conventions/` 로 간다.

## 타입은 로직과 따로 산다

모듈의 타입은 그 옆의 `<모듈>.types.ts` 로 간다. 로직 파일은 필요한 것만 import 하고
다시 내보내지 않는다. 소비자는 엔티티 배럴에서 타입을 가져오고, 배럴은 `.types` 를
가리킨다 — 모양만 필요한 코드가 구현에 묶이지 않게.

```
shared/lib/tool-shape/tool-shape.types.ts   ToolShape
shared/lib/tool-shape/tool-shape.ts         toolShape()
shared/lib/tool-shape/tool-shape.test.ts
```

`.types.ts` 는 값을 내보내지 않는다. 지워도 도는 것이 달라지지 않아야 한다.

선택 필드 대신 유니온으로 모델링한다. `AuthStatus` 는
`signed-in | signed-out | cli-missing` 이지 '있을 수도 있는' 필드 넷을 가진 레코드가
아니다. 그래야 로그아웃 상태가 이메일을 들고 있을 수 없다. 갈래를 더하면 그것을 다뤄야
할 자리를 컴파일러가 전부 세어 준다.

## 코드

**주석을 쓰지 않는다.** 이름과 테스트가 의도를 나른다. 예외는 도구가 읽는 지시
주석(`@ts-expect-error`, `eslint-disable`)뿐이다.

**같은 값을 반복해 비교하면 switch 로.** 같은 판별자를 세 번 이상 비교하면
`switch` 로 쓴다. 그래야 TypeScript 가 덮인 case 를 보고, 새 갈래가 조용히
빠져나가는 대신 컴파일에서 걸린다.

**모르는 것은 그리지 않는다.** 엔진이 보내지 않은 값은 0 도 아니고 `-` 도 아니다 —
그 칸 자체를 만들지 않는다. 실패는 이유와 함께 보여준다. 성공처럼 보이는 상태로
삼키지 않는다.

**손으로 깎은 값 대신 시맨틱 토큰.** `text-[13px]`, 맨손 `opacity-45`, 팔레트 색을
쓰지 않는다. 눈금은 Tailwind 스케일과 shadcn 토큰이 쥔다. 색이 허락된 자리는
에이전트 얼굴 하나뿐이다.

## 커밋

제목은 영어, 본문은 영어 다음 한국어를 `—— 한국어 ——` 로 가른다. 무엇을 했는지가
아니라 왜 그랬는지를 적는다 — 무엇을 했는지는 diff 가 이미 말한다.
