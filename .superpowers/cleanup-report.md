# 사진·유리 계산 기계 걷어내기 — 정리 보고

브랜치 `feat/status-surface`. 두 커밋으로 나눴다.

## 커밋 1 — `fix: 사진 배경 기계를 걷어낸다 — entity 와 IPC`

삭제:
- `src/entities/backdrop/**` 전부 (store, api, ui, 테스트, index)
- `src/pages/workspace/ui/controls/BackdropPicker.tsx` — 어디서도 import 하지 않는 것을 확인 후 삭제
- `electron/main.ts`: `IMAGE_MIME` 상수, `backdropMemoryPath`, `readImage`, `ipcMain.handle('backdrop:pick', ...)`, `ipcMain.handle('backdrop:restore', ...)`. 딸려 있던 `readFile`/`writeFile`/`extname`/`join` import 도 다른 용처가 없어 같이 뺐다 (`readFile`/`writeFile`는 이 파일에서 backdrop 전용이었다, `join`도 `backdropMemoryPath` 전용이었다)
- `electron/preload.ts`: `pickBackdropFile`, `restoreBackdropFile` 브리지 두 함수
- `src/shared/api/desk.ts`: `PickedBackdropFile` 타입, `DeskBridge.pickBackdropFile`/`restoreBackdropFile` 메서드

부수 정리:
- `src/entities/project/model/project-store.ts` 의 주석이 "backdrop-store 와 같은 결"이라며 이제 없는 파일을 가리키고 있어, 그 결 자체(참조 동일성)를 직접 설명하는 문장으로 바꿨다. 동작 변경 없음.

## 커밋 2 — `fix: 유리 틴트 계산 기계를 걷어낸다 — 사진 밝기를 재던 길`

삭제:
- `src/entities/glass/model/tint.ts` / `tint.test.ts` — `computeTint`, `GLASS_THICKNESS`, `GLASS_BLUR_PX`, `GlassTone`, 대비 보증 계산 전부
- `src/shared/lib/luminance.ts` / `luminance.test.ts` — `sampleLuminance`, `luminanceRangeOfRect`, `UnitRect`, `LuminanceProfile`, `LuminanceRange`. 이 파일들의 유일한 소비자가 `tint.ts`와 `backdrop` 엔티티(이미 삭제)였다
- `src/shared/lib/contrast.ts` / `contrast.test.ts` — `relativeLuminance`, `contrastRatio`, `MIN_CONTRAST`. `luminance.ts`와 `tint.ts` 말고 다른 소비자가 없는 것을 grep으로 확인했다
- `src/shared/api/luminance-worker.ts` / `luminance.worker.ts` — 배경 이미지를 워커로 분석하던 코드. `pickBackdrop`(이미 삭제) 말고 다른 호출자 없음

이동:
- `GlassTint` 타입을 `src/entities/glass/model/surface.ts`로 옮겼다. 필드는 그대로다(GlassPane이 `surface`, `surfaceSolid`, `text`, `scrimAlpha`, `blurPx`, `backdropBrightness`, `behindOpacity` 전부를 여전히 쓴다) — 주석만 "계산된 유리 틴트"에서 "판이 입는 표면"으로 다시 썼다. `entities/glass` 의 공개 표면(`@/entities/glass`)은 `GlassTint`와 `GlassPane`을 그대로 내보낸다.
- `GLASS_SATURATE`(1.3, 채도 보정 상수)는 `tint.ts` 소속이 아니라 `GlassPane.tsx` 자신의 블러 필터 조립에만 쓰이던 값이라 `GlassPane.tsx` 안의 지역 상수로 옮겼다. 지금은 `blurPx: 0`이라 이 분기가 실행되지 않지만, `tint.blurPx > 0` 조건 자체는 GlassPane 안에 남아 있어 값도 같이 남겨 뒀다 — 남긴 이유를 주석으로 적었다.

시그니처 변경 (신호를 따라감):
- `TileDeck`의 `tintFor` prop: `(unit: UnitRect) => GlassTint` → `() => GlassTint`. `useGlassTint`가 이미 인자 없는 상수 함수를 주고 있었으므로(d3bb89a) 실질적인 동작 변화는 없다. 호출부 `tintFor(toUnit(tile.rect, viewport))` → `tintFor()`.
- `TileDeck`의 지역 헬퍼 `toUnit(rect, viewport): UnitRect`는 그 인자를 만들려던 용도뿐이라 같이 지웠다.
- `Titlebar`가 export 하던 `TITLEBAR_UNIT_RECT`(자리 사각형 상수)도 지웠다 — `widgets/titlebar/index.ts`의 export 목록에서도 뺐다. 소비자가 없었다(사용된 곳을 찾지 못함).

테스트 변경 (신호를 따라감, 동작 변경 아님):
- `GlassPane.test.tsx`, `TileDeck.test.tsx`, `AgentTile.test.tsx` 세 파일은 `computeTint(...)`를 **fixture를 만드는 용도로만** 썼다 — GlassPane·TileDeck·AgentTile 자체의 틴트 계산 로직을 검증한 것이 아니라, 이미 계산된 값을 컴포넌트가 스타일/데이터로 올바르게 옮기는지를 봤다. `computeTint`가 사라지므로 각 파일에 리터럴 `GlassTint` 객체(`buildTint()` 헬퍼 또는 상수 `tint`)를 새로 두고 그걸 넘기게 바꿨다. 값 자체(색·알파)는 임의로 골랐고, 각 테스트의 단언은 그대로다.
- 결과: 순수하게 사라진 테스트(계산 로직 자체를 검증하던 `tint.test.ts`, `luminance.test.ts`, `contrast.test.ts`, backdrop 관련 테스트)만큼 테스트 수가 줄었다(358 → 310). 남은 테스트의 단언 내용은 하나도 바뀌지 않았다 — 픽스처를 만드는 방식만 바뀌었다.

## 확인한 것 (남긴 것)

- `MOTION.tintMs`는 손대지 않았다 — 지시대로 전환 시간 상수일 뿐, 틴트 계산과 무관하다.
- `GROUND`(`src/shared/config/theme.ts`, `#0a0a0b`)는 이미 d3bb89a에서 도입된 것으로 이번 작업과 무관하다. 손대지 않았다.
- 남은 `backdrop`/`Backdrop`/`luminance` 등 문자열은 전부 무관한 것들이다: CSS `backdrop-filter` 속성, `GlassTint.backdropBrightness` 필드, 그리고 그 이력을 설명하는 주석("예전에는 배경 사진의 밝기를…" 류) — grep으로 재확인했다.

## 발견했지만 건드리지 않은 것

- 특별히 없음. `GLASS_SATURATE`처럼 "지금은 실행되지 않는 분기가 쓰는 상수"가 하나 더 있었을 뿐(`GlassPane`의 `tint.blurPx > 0` 블록) — 이건 GlassPane 자체가 살아 있는 코드이므로 죽은 코드로 보지 않았다.

## 검증

각 커밋 전에 `npm test`(vitest), `npm run typecheck`, `npm run build` 세 가지를 모두 실행해 통과를 확인했다.
- 커밋 1 이후: 349 tests passed, typecheck clean, build clean
- 커밋 2 이후: 310 tests passed, typecheck clean, build clean
