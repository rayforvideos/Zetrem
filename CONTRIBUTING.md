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

Feature-Sliced Design. Layers lean one way only. A layer may import from the
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

`src/shared/ui/` belongs to the shadcn CLI. `npx shadcn@latest add` writes
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
entity barrel, which points at the `.types` file, so code that only needs a
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


---

# Zetrem 에 기여하기

여기 적힌 규칙은 `tests/conventions/` 의 테스트로 검사한다. 어기면 `npm test` 가
어느 규칙을 어디서 어겼는지 알려준다. 문서에 없는 규칙은 리뷰에서 요구하지 않는다.

## 폴더

Feature-Sliced Design 을 따른다. 의존 방향은 한쪽이다. 아래 레이어를 가져다 쓸 수
있지만 위 레이어는 참조하지 않는다.

```
src/app        조립 지점, 메인 프로세스와의 IPC 계약
src/pages      화면과 그 화면에 속한 상태
src/widgets    페이지가 배치하는 덩어리
src/entities   도메인 개념과 그것을 그리는 UI
src/shared     도메인을 모르는 것들
electron       메인 프로세스
tests          저장소 전체 규약 가드
```

`src/shared/ui/` 는 shadcn CLI 전용이다. `npx shadcn@latest add` 가 이 폴더에
파일을 만든다. 직접 만든 컴포넌트는 여기에 두지 않는다. `@/entities`·`@/widgets`·`@/pages`·
`@/app` 을 import 하는 컴포넌트는 shared 가 아니라 그 도메인 곁에 있어야 한다.
직접 만든 것은 `src/shared/graphics/`(마크·아이콘)나 해당 엔티티의 `ui/` 에 둔다.

## 테스트는 모듈과 같은 폴더에 둔다

테스트가 있는 모듈은 같은 이름의 폴더 안에 넣는다. 파일명은 그대로 둔다.

```
shared/lib/units/units.ts
shared/lib/units/units.test.ts
shared/lib/cn.ts               ← 테스트 없으면 폴더도 없다
```

한 모듈에 테스트 파일이 여럿 있어도 된다. 특정 모듈이 아니라 저장소 전체 규약을
지키는 테스트는 `tests/conventions/` 로 간다.

## 타입은 로직과 파일을 나눈다

모듈의 타입은 같은 폴더의 `<모듈>.types.ts` 에 둔다. 로직 파일은 필요한 것만
import 하고 다시 export 하지 않는다. 타입을 쓰는 쪽은 엔티티 배럴에서 가져오고,
배럴은 `.types` 를 참조한다. 타입만 필요한 코드가 구현에 의존하지 않게 하려는
것이다.

```
shared/lib/tool-shape/tool-shape.types.ts   ToolShape
shared/lib/tool-shape/tool-shape.ts         toolShape()
shared/lib/tool-shape/tool-shape.test.ts
```

`.types.ts` 에서는 값을 export 하지 않는다. 파일을 지워도 동작이 바뀌지 않아야
한다.

선택 필드 대신 유니온으로 모델링한다. `AuthStatus` 는
`signed-in | signed-out | cli-missing` 이지 '있을 수도 있는' 필드 넷이 달린 레코드가
아니다. 이렇게 하면 로그아웃 상태에 이메일이 들어갈 수 없다. 갈래를 추가하면
처리해야 할 위치를 컴파일러가 모두 알려준다.
