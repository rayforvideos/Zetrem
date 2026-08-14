# 유리 타일 셸 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 올린 배경 이미지 위에 반투명 유리 타일이 뜨고, 가짜 에이전트 세션이 시작되면 타일이 수면처럼 갈라졌다가 종료되면 닫히는 Electron 앱을 만든다.

**Architecture:** FSD(Feature-Sliced Design) 6레이어 중 `shared` · `entities` · `widgets` · `pages` · `app` 다섯을 쓴다. 도메인 규칙(밝기 샘플링·틴트 계산·격자 배치·셸 상태 전이)은 전부 프레임워크를 모르는 순수 모듈이라 화면 없이 Vitest 로 검증한다. React 컴포넌트는 그 결과를 받아 그리기만 한다. 에이전트 러너와 텔레메트리 지표는 레지스트리 뒤에 있어 추가가 파일 1개 + 등록 1줄이다.

**Tech Stack:** Electron 43.4.0 · electron-vite 5.0.0 · Vite 7.3.6 · React 19.2.8 · TypeScript 7.0.2 · Vitest 4.1.10

**설계 근거:** `docs/superpowers/specs/2026-08-12-ade-visual-design.md` 및 이 계획 직전의 설계 카드.

## Global Constraints

모든 태스크의 요구사항에 아래가 암묵적으로 포함된다.

- **버전 고정.** `electron@43.4.0` · `electron-vite@5.0.0` · `vite@7.3.6` · `react@19.2.8` · `react-dom@19.2.8` · `typescript@7.0.2` · `vitest@4.1.10` · `@vitejs/plugin-react@5.2.0` · `@types/react@19.2.18` · `@types/react-dom@19.2.4` · `@types/node@26.2.0`. `^` 없이 정확한 버전으로 설치한다.

- **Node 22 이상.** `electron@43.4.0` 의 engines 가 `>=22.12.0` 이다. 개발·실행 전에 `node --version` 을 확인하고 22 로 맞춘다. 20 에서도 설치는 되지만 경고이지 보증이 아니다.
- **`baseUrl` 을 쓰지 않는다.** TypeScript 7 에서 제거됐다(TS5102). 경로 별칭은 `"paths": { "@/*": ["./src/*"] }` 처럼 `./` 로 시작하는 상대 경로로만 쓴다.

  vite 는 7 이다. `electron-vite@5.0.0` 의 peer 가 `^5||^6||^7` 이라 vite 8 과 맞물리지 않고, vite 8 을 받는 `electron-vite@6` 은 아직 베타다. 토대에 베타를 깔거나 `--legacy-peer-deps` 로 upstream 이 검증한 적 없는 조합을 강제하지 않는다. `@vitejs/plugin-react` 도 6.x 는 vite `^8` 전용이라 5.2.0(vite 4–8)을 쓴다. **`--legacy-peer-deps` 나 `--force` 로 설치하지 않는다** — peer 충돌이 나면 그 자체가 보고 대상이다.
- **FSD 의존 방향.** 한 모듈은 자기보다 **엄격히 아래** 레이어에서만 import 한다. 아래에서 위로 `shared` → `entities` → `widgets` → `pages` → `app`. 같은 레이어의 옆 슬라이스는 import 하지 않는다.
- **공개 API.** 슬라이스마다 `index.ts` 하나를 두고 바깥은 그 파일만 참조한다. 슬라이스 내부 경로를 바깥이 짚지 않는다.
- **도메인 순수성.** `entities/*/model` · `entities/*/lib` · `shared/lib` 에는 `react` import 가 한 줄도 없다. 화면 없이 노드에서 실행돼야 한다.
- **좁은 IPC 계약.** preload 는 `ipcRenderer` 를 통째로 노출하지 않는다. 이름 붙인 함수만 `contextBridge` 로 내보낸다.
- **1층 텍스트 무애니메이션.** 스펙 §3 — 읽는 것은 움직이지 않는다.
- **대비 4.5:1.** 스펙 §4.2 — 본문 텍스트 영역은 어떤 배경에서도 대비비 4.5 이상을 확보한다. 이 제약은 미적 판단보다 우선한다.
- **상수에는 근거 주석.** 숫자만 남기지 않는다.
- **테스트 경계.** 순수 모듈은 Vitest 로 TDD 한다. 컴포넌트는 `react-dom/server` 의 `renderToStaticMarkup` 으로 스모크 테스트만 하고(추가 의존성 없음), "예쁨"은 각 UI 태스크 끝의 **시각 체크포인트**에서 사람이 눈으로 판정한다.
- **커밋 메시지.** 한국어 본문, `feat:` · `test:` · `chore:` 접두사.

---

### Task 1: 프로젝트 부트스트랩과 투명 창

투명 프레임리스 Electron 창에 React 가 렌더되고 Vitest 가 도는 상태까지 만든다.

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `electron.vite.config.ts`
- Create: `vitest.config.ts`
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `index.html`
- Create: `src/app/main.tsx`
- Create: `src/app/styles/global.css`
- Create: `.gitignore`

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces: `src/` 아래 FSD 트리의 루트. 렌더러 진입점 `src/app/main.tsx`. 테스트 러너 `npm test`.

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "zetrem",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@types/node": "26.2.0",
    "@types/react": "19.2.18",
    "@types/react-dom": "19.2.4",
    "@vitejs/plugin-react": "5.2.0",
    "electron": "43.4.0",
    "electron-vite": "5.0.0",
    "typescript": "7.0.2",
    "vite": "7.3.6",
    "vitest": "4.1.10"
  },
  "dependencies": {
    "react": "19.2.8",
    "react-dom": "19.2.8"
  }
}
```

- [ ] **Step 2: 의존성 설치**

Run: `npm install`
Expected: `node_modules/` 생성, 에러 없음. `--legacy-peer-deps` 나 `--force` 를 붙이지 않는다

설치 후 `node_modules/electron/dist` 가 비어 있으면 postinstall 이 안 돈 것이다(샌드박스에서 종종 그렇다). `node node_modules/electron/install.js` 로 바이너리를 받는다 — 계획의 문제가 아니라 환경 문제다

- [ ] **Step 3: tsconfig.json 작성**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["node", "vite/client"],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "electron", "*.config.ts"]
}
```

- [ ] **Step 4: electron.vite.config.ts 작성**

```ts
import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // lib.entry 를 쓰면 출력 파일이 입력 파일명을 따라간다(main.ts → out/main/main.js).
  // 입력 이름을 index 로 박아 package.json 의 main 필드와 맞춘다
  main: { build: { rollupOptions: { input: { index: resolve('electron/main.ts') } } } },
  preload: { build: { rollupOptions: { input: { index: resolve('electron/preload.ts') } } } },
  renderer: {
    root: '.',
    // electron-vite 는 src/renderer/index.html 만 자동 탐색한다.
    // 우리 src/ 는 FSD 레이어를 담는 곳이라 renderer 를 형제로 두지 않고 입력을 직접 지정한다
    build: { rollupOptions: { input: resolve('index.html') } },
    resolve: { alias: { '@': resolve('src') } },
    plugins: [react()],
  },
})
```

- [ ] **Step 5: vitest.config.ts 작성**

```ts
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': resolve('src') } },
  test: {
    // 도메인 모듈은 화면 없이 돌아야 한다 — jsdom 을 쓰지 않는 것이 제약의 일부다
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
```

- [ ] **Step 6: electron/main.ts 작성**

```ts
import { resolve } from 'node:path'
import { app, BrowserWindow } from 'electron'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    // 사용자 배경이 창 전체를 채우는 레이어이므로 창 자체가 투명해야 한다 (스펙 §6.5)
    transparent: true,
    frame: false,
    backgroundColor: '#00000000',
    webPreferences: {
      // package.json 이 type: module 이라 preload 출력이 .mjs 다
      preload: resolve(import.meta.dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const devUrl = process.env.ELECTRON_RENDERER_URL
  if (devUrl) {
    win.loadURL(devUrl)
  } else {
    win.loadFile(resolve(import.meta.dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 7: electron/preload.ts 작성 (이 태스크에서는 빈 계약)**

```ts
import { contextBridge } from 'electron'

// 이름 붙인 의도만 노출한다. ipcRenderer 를 통째로 넘기지 않는다.
// 배경 파일 API 는 Task 5 에서 여기에 추가된다.
contextBridge.exposeInMainWorld('desk', {})
```

- [ ] **Step 8: index.html 작성**

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <title>zetrem</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/app/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: src/app/styles/global.css 작성**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#root {
  height: 100%;
  /* 창이 투명하므로 body 가 색을 칠하면 배경 레이어가 가려진다 */
  background: transparent;
  overflow: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  /* 창 전체를 드래그 영역으로 두고, 상호작용 요소만 no-drag 로 되돌린다 */
  -webkit-app-region: drag;
}

button,
input,
canvas {
  -webkit-app-region: no-drag;
}
```

- [ ] **Step 10: src/app/main.tsx 작성**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'

const root = document.getElementById('root')
if (!root) throw new Error('#root 를 찾지 못했다')

createRoot(root).render(
  <StrictMode>
    <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#fff' }}>
      부트스트랩 완료
    </div>
  </StrictMode>,
)
```

- [ ] **Step 11: .gitignore 작성**

```
node_modules/
out/
dist/
.DS_Store
```

- [ ] **Step 12: 타입체크와 테스트 러너 확인**

Run: `npm run typecheck`
Expected: 에러 없이 종료

Run: `npm test`
Expected: `No test files found` 메시지. Vitest 는 이때 종료 코드 1 을 내는데, **이 태스크에서는 그것이 정상이다** — 테스트 파일이 아직 없기 때문이다. `--passWithNoTests` 를 붙이지 않는다. 붙이면 이후 태스크에서 테스트가 통째로 사라져도 초록불이 뜬다. 러너가 설정 오류로 죽는 것만 실패로 본다

- [ ] **Step 13: 시각 체크포인트 — 앱을 띄운다**

Run: `npm run dev`
Expected: 프레임 없는 창이 뜨고, 가운데 흰 글씨로 "부트스트랩 완료". 창 배경이 검은 사각형이 아니라 **투명**이어야 한다(뒤의 데스크톱이 비쳐야 함). 확인 후 창을 닫는다.

투명이 아니면 `transparent: true` 와 `backgroundColor: '#00000000'`, `global.css` 의 `background: transparent` 셋을 다시 본다.

- [ ] **Step 14: 커밋**

```bash
git add -A
git commit -m "chore: Electron + Vite + React + TS 부트스트랩, 투명 프레임리스 창"
```

---

### Task 2: 밝기 샘플링과 대비 계산 (`shared/lib`)

배경 이미지의 영역별 밝기를 구하고 WCAG 대비비를 계산하는 순수 모듈. 이후 모든 유리 계산의 토대다.

**Files:**
- Create: `src/shared/lib/luminance.ts`
- Create: `src/shared/lib/contrast.ts`
- Test: `src/shared/lib/luminance.test.ts`
- Test: `src/shared/lib/contrast.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `type Rgb = { r: number; g: number; b: number }` (0–255)
  - `type ImageSource = { width: number; height: number; data: Uint8ClampedArray }` (RGBA 4바이트)
  - `type LuminanceProfile = { cols: number; rows: number; cells: number[] }` — `cells` 는 행 우선 0–1 상대 휘도
  - `sampleLuminance(image: ImageSource, cols: number, rows: number): LuminanceProfile`
  - `luminanceOfRect(p: LuminanceProfile, rect: UnitRect): number` — `UnitRect = { x: number; y: number; w: number; h: number }` 는 0–1 정규화 좌표
  - `relativeLuminance(rgb: Rgb): number`
  - `contrastRatio(l1: number, l2: number): number`
  - `MIN_CONTRAST: 4.5`

- [ ] **Step 1: contrast 실패 테스트 작성**

`src/shared/lib/contrast.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { MIN_CONTRAST, contrastRatio, relativeLuminance } from './contrast'

describe('relativeLuminance', () => {
  it('검정은 0, 흰색은 1', () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBe(0)
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5)
  })

  it('녹색이 청색보다 밝게 계산된다', () => {
    const green = relativeLuminance({ r: 0, g: 255, b: 0 })
    const blue = relativeLuminance({ r: 0, g: 0, b: 255 })
    expect(green).toBeGreaterThan(blue)
  })
})

describe('contrastRatio', () => {
  it('흑백 대비는 21', () => {
    expect(contrastRatio(0, 1)).toBeCloseTo(21, 5)
  })

  it('인자 순서가 결과를 바꾸지 않는다', () => {
    expect(contrastRatio(0.1, 0.8)).toBeCloseTo(contrastRatio(0.8, 0.1), 10)
  })

  it('같은 밝기끼리는 1', () => {
    expect(contrastRatio(0.42, 0.42)).toBeCloseTo(1, 10)
  })

  it('AA 기준선은 4.5', () => {
    expect(MIN_CONTRAST).toBe(4.5)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/shared/lib/contrast.test.ts`
Expected: FAIL — `Failed to resolve import './contrast'`

- [ ] **Step 3: contrast.ts 구현**

```ts
export type Rgb = { r: number; g: number; b: number }

/** WCAG 2.1 본문 텍스트 최소 대비. 스펙 §4.2 의 하드 제약 */
export const MIN_CONTRAST = 4.5

function linearize(channel8bit: number): number {
  const c = channel8bit / 255
  // sRGB 감마 역변환. 임계값 0.03928 과 지수 2.4 는 WCAG 2.1 정의값
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance({ r, g, b }: Rgb): number {
  // 계수는 sRGB 휘도 가중치. 사람 눈이 녹색에 가장 민감하다
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

export function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  // 0.05 는 WCAG 정의의 흑색 보정항
  return (lighter + 0.05) / (darker + 0.05)
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/shared/lib/contrast.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: luminance 실패 테스트 작성**

`src/shared/lib/luminance.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { ImageSource } from './luminance'
import { luminanceOfRect, sampleLuminance } from './luminance'

/** 왼쪽 절반 검정, 오른쪽 절반 흰색인 4x2 이미지 */
function halfAndHalf(): ImageSource {
  const width = 4
  const height = 2
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4
      const v = x < width / 2 ? 0 : 255
      data[i] = v
      data[i + 1] = v
      data[i + 2] = v
      data[i + 3] = 255
    }
  }
  return { width, height, data }
}

describe('sampleLuminance', () => {
  it('요청한 격자 크기만큼 셀을 낸다', () => {
    const p = sampleLuminance(halfAndHalf(), 2, 1)
    expect(p.cols).toBe(2)
    expect(p.rows).toBe(1)
    expect(p.cells).toHaveLength(2)
  })

  it('왼쪽 셀은 어둡고 오른쪽 셀은 밝다', () => {
    const p = sampleLuminance(halfAndHalf(), 2, 1)
    expect(p.cells[0]).toBeCloseTo(0, 5)
    expect(p.cells[1]).toBeCloseTo(1, 5)
  })

  it('셀이 픽셀보다 많아도 깨지지 않는다', () => {
    const p = sampleLuminance(halfAndHalf(), 8, 8)
    expect(p.cells).toHaveLength(64)
    expect(p.cells.every((c) => c >= 0 && c <= 1)).toBe(true)
  })
})

describe('luminanceOfRect', () => {
  it('왼쪽 절반만 덮으면 어두운 값이 나온다', () => {
    const p = sampleLuminance(halfAndHalf(), 2, 1)
    expect(luminanceOfRect(p, { x: 0, y: 0, w: 0.5, h: 1 })).toBeCloseTo(0, 5)
  })

  it('전체를 덮으면 두 셀의 평균이 나온다', () => {
    const p = sampleLuminance(halfAndHalf(), 2, 1)
    expect(luminanceOfRect(p, { x: 0, y: 0, w: 1, h: 1 })).toBeCloseTo(0.5, 5)
  })

  it('격자 밖으로 나가도 값이 범위 안이다', () => {
    const p = sampleLuminance(halfAndHalf(), 2, 1)
    const v = luminanceOfRect(p, { x: -0.5, y: -0.5, w: 3, h: 3 })
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThanOrEqual(1)
  })
})
```

- [ ] **Step 6: 테스트 실패 확인**

Run: `npx vitest run src/shared/lib/luminance.test.ts`
Expected: FAIL — `Failed to resolve import './luminance'`

- [ ] **Step 7: luminance.ts 구현**

```ts
import { relativeLuminance } from './contrast'

export type ImageSource = {
  width: number
  height: number
  /** RGBA 4바이트 배열 — ImageData.data 와 같은 형태 */
  data: Uint8ClampedArray
}

/** 0–1 로 정규화된 사각형. 뷰포트 크기를 몰라도 되게 한다 */
export type UnitRect = { x: number; y: number; w: number; h: number }

export type LuminanceProfile = {
  cols: number
  rows: number
  /** 행 우선 0–1 상대 휘도 */
  cells: number[]
}

export function sampleLuminance(
  image: ImageSource,
  cols: number,
  rows: number,
): LuminanceProfile {
  const cells: number[] = []
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x0 = Math.floor((col / cols) * image.width)
      const x1 = Math.max(x0 + 1, Math.floor(((col + 1) / cols) * image.width))
      const y0 = Math.floor((row / rows) * image.height)
      const y1 = Math.max(y0 + 1, Math.floor(((row + 1) / rows) * image.height))
      cells.push(meanLuminance(image, x0, x1, y0, y1))
    }
  }
  return { cols, rows, cells }
}

export function luminanceOfRect(profile: LuminanceProfile, rect: UnitRect): number {
  const { cols, rows, cells } = profile
  const colFrom = clampIndex(Math.floor(rect.x * cols), cols)
  const colTo = clampIndex(Math.ceil((rect.x + rect.w) * cols) - 1, cols)
  const rowFrom = clampIndex(Math.floor(rect.y * rows), rows)
  const rowTo = clampIndex(Math.ceil((rect.y + rect.h) * rows) - 1, rows)

  let sum = 0
  let count = 0
  for (let row = rowFrom; row <= rowTo; row += 1) {
    for (let col = colFrom; col <= colTo; col += 1) {
      sum += cells[row * cols + col] ?? 0
      count += 1
    }
  }
  return count === 0 ? 0 : sum / count
}

function meanLuminance(
  image: ImageSource,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): number {
  let sum = 0
  let count = 0
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * image.width + x) * 4
      sum += relativeLuminance({
        r: image.data[i] ?? 0,
        g: image.data[i + 1] ?? 0,
        b: image.data[i + 2] ?? 0,
      })
      count += 1
    }
  }
  return count === 0 ? 0 : sum / count
}

function clampIndex(value: number, size: number): number {
  return Math.min(Math.max(value, 0), size - 1)
}
```

- [ ] **Step 8: 테스트 통과 확인**

Run: `npx vitest run src/shared/lib`
Expected: PASS (12 tests)

- [ ] **Step 9: 커밋**

```bash
git add src/shared/lib
git commit -m "feat: 밝기 샘플링과 WCAG 대비 계산 추가"
```

---

### Task 3: 적응형 틴트와 대비 보증 (`entities/glass`)

배경 밝기와 사용자의 유리 두께로부터 실제 칠할 유리 색·글씨 색·텍스트 뒤 스크림 농도를 계산한다. **4.5:1 을 못 맞추면 스크림을 올려서 맞춘다.** 이 앱에서 가장 중요한 규칙이라 순수 함수로 격리해 테스트한다.

**Files:**
- Create: `src/entities/glass/model/tint.ts`
- Create: `src/entities/glass/index.ts`
- Test: `src/entities/glass/model/tint.test.ts`

**Interfaces:**
- Consumes: `@/shared/lib/contrast` 의 `relativeLuminance` · `contrastRatio` · `MIN_CONTRAST`
- Produces:
  - `type GlassTint = { surface: string; text: string; scrimAlpha: number; blurPx: number }` — `surface` 와 `text` 는 CSS 색 문자열
  - `computeTint(backgroundLuminance: number, thickness: number): GlassTint`
  - `GLASS_BLUR_PX: 24`

- [ ] **Step 1: 실패 테스트 작성**

`src/entities/glass/model/tint.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { MIN_CONTRAST, contrastRatio, relativeLuminance } from '@/shared/lib/contrast'
import { computeTint } from './tint'

/** rgba(r, g, b, a) 문자열을 되읽는다 — 테스트가 구현의 출력 형태를 검증한다 */
function parseRgba(css: string): { r: number; g: number; b: number; a: number } {
  const m = css.match(/rgba?\(([^)]+)\)/)
  if (!m) throw new Error(`rgba 형태가 아니다: ${css}`)
  const [r, g, b, a] = m[1]!.split(',').map((s) => Number(s.trim()))
  return { r: r!, g: g!, b: b!, a: a ?? 1 }
}

/** 배경 위에 유리와 스크림을 순서대로 합성했을 때의 최종 휘도 */
function compositedLuminance(backgroundLuminance: number, css: string, scrimAlpha: number): number {
  const surface = parseRgba(css)
  const surfaceL = relativeLuminance(surface)
  const afterGlass = backgroundLuminance * (1 - surface.a) + surfaceL * surface.a
  // 스크림은 항상 검정. 텍스트를 배경에서 떼어내는 국소 그라디언트다
  return afterGlass * (1 - scrimAlpha)
}

const SAMPLES = [0, 0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95, 1]
const THICKNESSES = [0, 0.25, 0.5, 0.75, 1]

describe('computeTint', () => {
  it('어떤 배경·두께 조합에서도 본문 대비 4.5 이상을 확보한다', () => {
    for (const bg of SAMPLES) {
      for (const thickness of THICKNESSES) {
        const tint = computeTint(bg, thickness)
        const behind = compositedLuminance(bg, tint.surface, tint.scrimAlpha)
        const textL = relativeLuminance(parseRgba(tint.text))
        const ratio = contrastRatio(textL, behind)
        expect(
          ratio,
          `bg=${bg} thickness=${thickness} ratio=${ratio.toFixed(2)}`,
        ).toBeGreaterThanOrEqual(MIN_CONTRAST)
      }
    }
  })

  it('밝은 배경에는 어두운 유리와 밝은 글씨를 준다', () => {
    const tint = computeTint(0.9, 0.5)
    const surface = parseRgba(tint.surface)
    const text = parseRgba(tint.text)
    expect(relativeLuminance(surface)).toBeLessThan(0.5)
    expect(relativeLuminance(text)).toBeGreaterThan(0.5)
  })

  it('어두운 배경에는 밝은 유리와 어두운 글씨를 준다', () => {
    const tint = computeTint(0.05, 0.5)
    const surface = parseRgba(tint.surface)
    const text = parseRgba(tint.text)
    expect(relativeLuminance(surface)).toBeGreaterThan(0.5)
    expect(relativeLuminance(text)).toBeLessThan(0.5)
  })

  it('두께를 올리면 유리 불투명도가 올라간다', () => {
    const thin = parseRgba(computeTint(0.5, 0).surface)
    const thick = parseRgba(computeTint(0.5, 1).surface)
    expect(thick.a).toBeGreaterThan(thin.a)
  })

  it('스크림은 0 이상 1 이하이고, 필요 없으면 0 이다', () => {
    for (const bg of SAMPLES) {
      const { scrimAlpha } = computeTint(bg, 1)
      expect(scrimAlpha).toBeGreaterThanOrEqual(0)
      expect(scrimAlpha).toBeLessThanOrEqual(1)
    }
    // 두께 최대 + 대비가 이미 충분한 조합에서는 스크림이 필요 없다
    expect(computeTint(0.5, 1).scrimAlpha).toBe(0)
  })

  it('범위 밖 입력을 클램프한다', () => {
    expect(() => computeTint(-1, 5)).not.toThrow()
    const tint = computeTint(-1, 5)
    expect(parseRgba(tint.surface).a).toBeLessThanOrEqual(1)
  })

  it('블러 반경은 스펙의 24px', () => {
    expect(computeTint(0.5, 0.5).blurPx).toBe(24)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/entities/glass`
Expected: FAIL — `Failed to resolve import './tint'`

- [ ] **Step 3: tint.ts 구현**

```ts
import { MIN_CONTRAST, contrastRatio, relativeLuminance } from '@/shared/lib/contrast'

export type GlassTint = {
  /** 유리 표면 색. rgba() 문자열 */
  surface: string
  /** 본문 텍스트 색. rgba() 문자열 */
  text: string
  /** 텍스트 뒤에만 까는 검정 그라디언트 농도 (0–1) */
  scrimAlpha: number
  blurPx: number
}

/** 스펙 §4.2 의 기본 블러 반경 */
export const GLASS_BLUR_PX = 24

/** 이 값을 넘으면 밝은 배경으로 보고 어두운 유리를 쓴다 */
const BRIGHT_THRESHOLD = 0.5

/** 유리 불투명도 범위. 0.30 아래는 배경이 이겨서 글자가 흔들리고, 0.85 위는 배경이 안 보인다 */
const ALPHA_MIN = 0.3
const ALPHA_MAX = 0.85

/** 스크림을 올리는 단위. 0.05 보다 잘게 올려도 눈으로 구분되지 않는다 */
const SCRIM_STEP = 0.05

const DARK_SURFACE = { r: 12, g: 14, b: 18 }
const LIGHT_SURFACE = { r: 246, g: 247, b: 250 }
const LIGHT_TEXT = { r: 255, g: 255, b: 255 }
const DARK_TEXT = { r: 11, g: 12, b: 14 }

export function computeTint(backgroundLuminance: number, thickness: number): GlassTint {
  const bg = clamp01(backgroundLuminance)
  const t = clamp01(thickness)

  const isBrightBackground = bg > BRIGHT_THRESHOLD
  const surface = isBrightBackground ? DARK_SURFACE : LIGHT_SURFACE
  const text = isBrightBackground ? LIGHT_TEXT : DARK_TEXT

  const alpha = ALPHA_MIN + (ALPHA_MAX - ALPHA_MIN) * t
  const surfaceLuminance = relativeLuminance(surface)
  const afterGlass = bg * (1 - alpha) + surfaceLuminance * alpha
  const textLuminance = relativeLuminance(text)

  return {
    surface: rgba(surface, alpha),
    text: rgba(text, 1),
    scrimAlpha: findScrim(afterGlass, textLuminance),
    blurPx: GLASS_BLUR_PX,
  }
}

/**
 * 유리만으로 4.5:1 이 안 나오면 텍스트 뒤 검정 스크림을 올려서 맞춘다.
 * 스크림은 검정이므로 합성 휘도가 단조 감소한다 — 밝은 글씨일 때만 대비가 오른다.
 * 어두운 글씨인데 대비가 모자라면 스크림은 오히려 해가 되므로 0 을 준다.
 */
function findScrim(afterGlass: number, textLuminance: number): number {
  if (contrastRatio(textLuminance, afterGlass) >= MIN_CONTRAST) return 0
  if (textLuminance < afterGlass) return 0

  for (let scrim = SCRIM_STEP; scrim <= 1; scrim += SCRIM_STEP) {
    const behind = afterGlass * (1 - scrim)
    if (contrastRatio(textLuminance, behind) >= MIN_CONTRAST) {
      return Number(scrim.toFixed(2))
    }
  }
  return 1
}

function rgba({ r, g, b }: { r: number; g: number; b: number }, a: number): string {
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1)
}
```

- [ ] **Step 4: 테스트 실행 — 대비 보증이 실제로 성립하는지 본다**

Run: `npx vitest run src/entities/glass`
Expected: PASS (7 tests)

FAIL 이 나면 실패 메시지의 `bg=... thickness=... ratio=...` 를 읽는다. 어두운 글씨(어두운 배경) 쪽에서 대비가 모자라면 `LIGHT_SURFACE` 를 더 밝게 하거나 `ALPHA_MIN` 을 올린다. **테스트를 완화하지 않는다** — 4.5:1 은 하드 제약이다.

- [ ] **Step 5: 공개 API 작성**

`src/entities/glass/index.ts`:

```ts
export { GLASS_BLUR_PX, computeTint } from './model/tint'
export type { GlassTint } from './model/tint'
```

- [ ] **Step 6: 타입체크**

Run: `npm run typecheck`
Expected: 에러 없음

- [ ] **Step 7: 커밋**

```bash
git add src/entities/glass
git commit -m "feat: 배경 밝기에 적응하는 유리 틴트와 4.5:1 대비 보증"
```

---

### Task 4: 물 문법 상수와 유리 표면 컴포넌트

모션 파라미터를 한 파일에 모으고, 틴트를 받아 실제로 그리는 유리 컴포넌트를 만든다. 물성 튜닝이 항상 한 곳에서 끝나게 하는 것이 이 태스크의 목적이다.

**Files:**
- Create: `src/shared/config/motion.ts`
- Create: `src/entities/glass/ui/GlassPane.tsx`
- Modify: `src/entities/glass/index.ts`
- Modify: `src/app/main.tsx`
- Test: `src/shared/config/motion.test.ts`
- Test: `src/entities/glass/ui/GlassPane.test.tsx`

**Interfaces:**
- Consumes: `GlassTint` (Task 3)
- Produces:
  - `MOTION = { fanMs: 500, mergeMs: 400, staggerMs: 60, easing: string }`
  - `LAYOUT = { outerMarginPx: 48, gapPx: 16, soloInsetRatio: 0.1 }`
  - `staggerDelay(index: number): number`
  - `<GlassPane tint style children />` — 유리 한 장을 그린다

- [ ] **Step 1: motion 실패 테스트 작성**

`src/shared/config/motion.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { LAYOUT, MOTION, staggerDelay } from './motion'

describe('MOTION', () => {
  it('스펙의 물 문법 값을 그대로 가진다', () => {
    expect(MOTION.fanMs).toBe(500)
    expect(MOTION.mergeMs).toBe(400)
    expect(MOTION.staggerMs).toBe(60)
  })

  it('닫힘이 열림보다 빠르다', () => {
    expect(MOTION.mergeMs).toBeLessThan(MOTION.fanMs)
  })

  it('이징은 cubic-bezier 하나로 통일돼 있다', () => {
    expect(MOTION.easing).toMatch(/^cubic-bezier\(/)
  })
})

describe('staggerDelay', () => {
  it('인덱스에 비례해 어긋난다', () => {
    expect(staggerDelay(0)).toBe(0)
    expect(staggerDelay(1)).toBe(60)
    expect(staggerDelay(3)).toBe(180)
  })

  it('마지막 타일이 늦게 시작해도 전체가 전환 시간 안에 끝난다', () => {
    // 타일 6개까지는 스태거 총합이 fanMs 를 넘지 않아야 물결로 읽힌다
    expect(staggerDelay(5) + MOTION.fanMs).toBeLessThanOrEqual(MOTION.fanMs * 2)
  })
})

describe('LAYOUT', () => {
  it('바깥 여백이 0 이 아니다 — 배경이 항상 보여야 한다', () => {
    expect(LAYOUT.outerMarginPx).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/shared/config`
Expected: FAIL — `Failed to resolve import './motion'`

- [ ] **Step 3: motion.ts 구현**

```ts
/**
 * 물 문법 — 앱 안의 모든 전환이 이 값을 쓴다 (스펙 §3).
 * 물성을 바꾸려면 여기만 고친다.
 */
export const MOTION = {
  /** 분할. 눈이 따라갈 수 있는 상한 */
  fanMs: 500,
  /** 병합. 닫힘이 살짝 빨라야 미련이 남지 않는다 */
  mergeMs: 400,
  /** 타일 간 어긋남. 동시에 움직이면 물결이 아니라 격자 전환이다 */
  staggerMs: 60,
  /** 관성이 느껴지는 곡선. 시작이 느리고 끝이 길게 풀린다 */
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const

export const LAYOUT = {
  /** 타일이 뷰포트 끝까지 차면 배경이 죽는다 (스펙 §2.2) */
  outerMarginPx: 48,
  gapPx: 16,
  /** Solo 한 장이 남기는 여백 비율 — 화면의 80%를 차지한다 (스펙 §2.1) */
  soloInsetRatio: 0.1,
} as const

export function staggerDelay(index: number): number {
  return index * MOTION.staggerMs
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/shared/config`
Expected: PASS (6 tests)

- [ ] **Step 5: GlassPane 실패 테스트 작성**

`src/entities/glass/ui/GlassPane.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { computeTint } from '../model/tint'
import { GlassPane } from './GlassPane'

describe('GlassPane', () => {
  it('틴트의 표면 색과 블러를 스타일로 반영한다', () => {
    const tint = computeTint(0.9, 0.5)
    const html = renderToStaticMarkup(<GlassPane tint={tint}>내용</GlassPane>)
    expect(html).toContain('blur(24px)')
    expect(html).toContain('내용')
  })

  it('스크림이 필요 없으면 스크림 레이어를 그리지 않는다', () => {
    const tint = { ...computeTint(0.5, 1), scrimAlpha: 0 }
    const html = renderToStaticMarkup(<GlassPane tint={tint}>내용</GlassPane>)
    expect(html).not.toContain('data-scrim')
  })

  it('스크림이 필요하면 스크림 레이어를 그린다', () => {
    const tint = { ...computeTint(0.5, 1), scrimAlpha: 0.4 }
    const html = renderToStaticMarkup(<GlassPane tint={tint}>내용</GlassPane>)
    expect(html).toContain('data-scrim')
  })
})
```

- [ ] **Step 6: 테스트 실패 확인**

Run: `npx vitest run src/entities/glass/ui`
Expected: FAIL — `Failed to resolve import './GlassPane'`

- [ ] **Step 7: GlassPane.tsx 구현**

```tsx
import type { CSSProperties, ReactNode } from 'react'
import type { GlassTint } from '../model/tint'

type GlassPaneProps = {
  tint: GlassTint
  style?: CSSProperties
  children: ReactNode
}

export function GlassPane({ tint, style, children }: GlassPaneProps) {
  return (
    <div style={{ ...shellStyle, backgroundColor: tint.surface, color: tint.text, ...style }}>
      <div
        style={{
          ...blurStyle,
          backdropFilter: `blur(${tint.blurPx}px)`,
          WebkitBackdropFilter: `blur(${tint.blurPx}px)`,
        }}
      />
      {tint.scrimAlpha > 0 && (
        <div data-scrim style={{ ...scrimStyle, opacity: tint.scrimAlpha }} />
      )}
      <div style={contentStyle}>{children}</div>
    </div>
  )
}

const shellStyle: CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: 18,
  border: '1px solid rgba(255, 255, 255, 0.14)',
}

const blurStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
}

/** 텍스트 뒤에만 까는 그라디언트. 타일 전체를 어둡게 하지 않는다 (스펙 §4.2) */
const scrimStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.35) 60%, transparent 100%)',
  pointerEvents: 'none',
}

const contentStyle: CSSProperties = {
  position: 'relative',
  height: '100%',
}
```

- [ ] **Step 8: 테스트 통과 확인**

Run: `npx vitest run src/entities/glass`
Expected: PASS (10 tests)

- [ ] **Step 9: 공개 API 갱신**

`src/entities/glass/index.ts`:

```ts
export { GLASS_BLUR_PX, computeTint } from './model/tint'
export type { GlassTint } from './model/tint'
export { GlassPane } from './ui/GlassPane'
```

- [ ] **Step 10: 시각 체크포인트 준비 — main.tsx 임시 교체**

`src/app/main.tsx` 의 렌더 내용을 아래로 바꾼다:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GlassPane, computeTint } from '@/entities/glass'
import { LAYOUT } from '@/shared/config/motion'
import './styles/global.css'

const root = document.getElementById('root')
if (!root) throw new Error('#root 를 찾지 못했다')

// 배경 연결 전 임시 확인용. Task 5 에서 실제 배경으로 교체된다
const demoTint = computeTint(0.75, 0.5)

createRoot(root).render(
  <StrictMode>
    <div
      style={{
        height: '100%',
        padding: LAYOUT.outerMarginPx,
        background: 'linear-gradient(140deg, #cfe4f7 0%, #f6e7c9 60%, #4a6b8a 100%)',
      }}
    >
      <GlassPane tint={demoTint} style={{ height: '100%', padding: 28 }}>
        <div style={{ fontSize: 22 }}>유리 한 장</div>
      </GlassPane>
    </div>
  </StrictMode>,
)
```

- [ ] **Step 11: 시각 체크포인트 — 유리가 유리처럼 보이는가**

Run: `npm run dev`

확인 항목:
- 유리 뒤로 그라디언트가 **비쳐 보인다** (완전 불투명하면 실패)
- 유리 경계가 흐릿하게 번진다 (블러가 걸렸다)
- "유리 한 장" 글씨가 또렷하게 읽힌다
- 사방에 48px 여백이 있어 배경이 보인다

확인 후 창을 닫는다.

- [ ] **Step 12: 커밋**

```bash
git add -A
git commit -m "feat: 물 문법 상수와 유리 표면 컴포넌트"
```

---

### Task 5: 배경 이미지 (`entities/backdrop` + IPC + 워커)

사용자가 배경을 고르고, 그 밝기를 워커에서 분석해 저장한다. 렌더 루프에서 픽셀을 읽지 않는 것이 이 태스크의 제약이다.

**Files:**
- Create: `src/shared/api/luminance-worker.ts`
- Create: `src/shared/api/luminance.worker.ts`
- Create: `src/entities/backdrop/model/backdrop.ts`
- Create: `src/entities/backdrop/model/backdrop-store.ts`
- Create: `src/entities/backdrop/api/backdrop-file.ts`
- Create: `src/entities/backdrop/ui/BackdropLayer.tsx`
- Create: `src/entities/backdrop/index.ts`
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Test: `src/entities/backdrop/model/backdrop-store.test.ts`

**Interfaces:**
- Consumes: `sampleLuminance` · `LuminanceProfile` · `luminanceOfRect` (Task 2)
- Produces:
  - `type Backdrop = { url: string; profile: LuminanceProfile }`
  - `backdropStore` — `{ get(): BackdropState; set(b: Backdrop | null): void; setThickness(v: number): void; subscribe(fn: () => void): () => void }`
  - `type BackdropState = { backdrop: Backdrop | null; thickness: number }`
  - `pickBackdrop(): Promise<Backdrop | null>`
  - `<BackdropLayer backdrop />`
  - `window.desk.pickBackdropPath(): Promise<string | null>`

- [ ] **Step 1: 워커와 워커 클라이언트 작성**

`src/shared/api/luminance.worker.ts`:

```ts
import { sampleLuminance } from '@/shared/lib/luminance'
import type { LuminanceProfile } from '@/shared/lib/luminance'

export type LuminanceRequest = { bitmap: ImageBitmap; cols: number; rows: number }

self.onmessage = (event: MessageEvent<LuminanceRequest>) => {
  const { bitmap, cols, rows } = event.data
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('OffscreenCanvas 2d 컨텍스트를 못 얻었다')
  ctx.drawImage(bitmap, 0, 0)
  const image = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
  const profile: LuminanceProfile = sampleLuminance(image, cols, rows)
  self.postMessage(profile)
  bitmap.close()
}
```

`src/shared/api/luminance-worker.ts`:

```ts
import type { LuminanceProfile } from '@/shared/lib/luminance'

/** 샘플링 격자. 타일 6개 배치에서 타일마다 최소 몇 셀은 덮이는 해상도 */
const COLS = 16
const ROWS = 12

/**
 * 배경 밝기 분석을 워커로 보낸다.
 * 렌더 루프에서 픽셀을 읽지 않기 위한 경계다 (스펙 §6.5).
 */
export async function sampleBackdropLuminance(url: string): Promise<LuminanceProfile> {
  const response = await fetch(url)
  const bitmap = await createImageBitmap(await response.blob())
  const worker = new Worker(new URL('./luminance.worker.ts', import.meta.url), {
    type: 'module',
  })
  try {
    return await new Promise<LuminanceProfile>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<LuminanceProfile>) => resolve(event.data)
      worker.onerror = (event) => reject(new Error(event.message))
      worker.postMessage({ bitmap, cols: COLS, rows: ROWS }, [bitmap])
    })
  } finally {
    worker.terminate()
  }
}
```

- [ ] **Step 2: 메인 프로세스에 파일 다이얼로그 핸들러 추가**

`electron/main.ts` 상단 import 를 아래로 바꾸고,

```ts
import { resolve } from 'node:path'
import { BrowserWindow, app, dialog, ipcMain } from 'electron'
```

`app.whenReady().then(...)` 바로 위에 아래를 넣는다:

```ts
ipcMain.handle('backdrop:pick', async (): Promise<string | null> => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: '이미지', extensions: ['png', 'jpg', 'jpeg', 'webp', 'avif'] }],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0] ?? null
})
```

- [ ] **Step 3: preload 에 좁은 계약 노출**

`electron/preload.ts` 전체를 아래로 교체:

```ts
import { contextBridge, ipcRenderer } from 'electron'

/**
 * 이름 붙인 의도만 노출한다.
 * ipcRenderer 를 통째로 넘기면 이 화살표의 계약이 메인 프로세스 전체가 된다.
 */
contextBridge.exposeInMainWorld('desk', {
  pickBackdropPath: (): Promise<string | null> => ipcRenderer.invoke('backdrop:pick'),
})
```

- [ ] **Step 4: 계약과 전역 타입 선언**

`src/entities/backdrop/model/backdrop.ts`:

```ts
import type { LuminanceProfile } from '@/shared/lib/luminance'

export type Backdrop = {
  /** 렌더러가 그릴 수 있는 URL (file:// 또는 blob:) */
  url: string
  profile: LuminanceProfile
}

export type BackdropState = {
  backdrop: Backdrop | null
  /** 유리 두께 0–1. 사용자가 만지는 유일한 노브 (스펙 §4.3) */
  thickness: number
}

declare global {
  interface Window {
    desk: {
      pickBackdropPath(): Promise<string | null>
    }
  }
}
```

- [ ] **Step 5: 스토어 실패 테스트 작성**

`src/entities/backdrop/model/backdrop-store.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backdropStore } from './backdrop-store'

const profile = { cols: 1, rows: 1, cells: [0.5] }

beforeEach(() => {
  backdropStore.set(null)
  backdropStore.setThickness(0.5)
})

describe('backdropStore', () => {
  it('초기 두께는 0.5 다', () => {
    expect(backdropStore.get().thickness).toBe(0.5)
  })

  it('배경을 넣으면 읽힌다', () => {
    backdropStore.set({ url: 'file:///a.png', profile })
    expect(backdropStore.get().backdrop?.url).toBe('file:///a.png')
  })

  it('두께는 0–1 로 클램프된다', () => {
    backdropStore.setThickness(5)
    expect(backdropStore.get().thickness).toBe(1)
    backdropStore.setThickness(-2)
    expect(backdropStore.get().thickness).toBe(0)
  })

  it('구독자에게 변화를 알린다', () => {
    const listener = vi.fn()
    const unsubscribe = backdropStore.subscribe(listener)
    backdropStore.set({ url: 'file:///b.png', profile })
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    backdropStore.setThickness(0.9)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('상태 객체는 매번 새 참조가 아니다 — 변화가 없으면 같은 참조', () => {
    const before = backdropStore.get()
    expect(backdropStore.get()).toBe(before)
  })
})
```

- [ ] **Step 6: 테스트 실패 확인**

Run: `npx vitest run src/entities/backdrop`
Expected: FAIL — `Failed to resolve import './backdrop-store'`

- [ ] **Step 7: 스토어 구현**

`src/entities/backdrop/model/backdrop-store.ts`:

```ts
import type { Backdrop, BackdropState } from './backdrop'

type Listener = () => void

let state: BackdropState = { backdrop: null, thickness: 0.5 }
const listeners = new Set<Listener>()

function emit(next: BackdropState): void {
  state = next
  for (const listener of listeners) listener()
}

export const backdropStore = {
  /** useSyncExternalStore 가 참조 동일성으로 재렌더를 판정하므로 같은 객체를 돌려준다 */
  get(): BackdropState {
    return state
  },
  set(backdrop: Backdrop | null): void {
    emit({ ...state, backdrop })
  },
  setThickness(thickness: number): void {
    emit({ ...state, thickness: Math.min(Math.max(thickness, 0), 1) })
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
```

- [ ] **Step 8: 테스트 통과 확인**

Run: `npx vitest run src/entities/backdrop`
Expected: PASS (5 tests)

- [ ] **Step 9: 캡슐화 — 파일 선택에서 Backdrop 까지**

`src/entities/backdrop/api/backdrop-file.ts`:

```ts
import { sampleBackdropLuminance } from '@/shared/api/luminance-worker'
import type { Backdrop } from '../model/backdrop'

/** 파일 다이얼로그를 열고, 고른 이미지를 밝기 프로필까지 붙여 도메인 형태로 돌려준다 */
export async function pickBackdrop(): Promise<Backdrop | null> {
  const path = await window.desk.pickBackdropPath()
  if (!path) return null
  const url = `file://${path}`
  return { url, profile: await sampleBackdropLuminance(url) }
}
```

- [ ] **Step 10: 배경 표현 컴포넌트**

`src/entities/backdrop/ui/BackdropLayer.tsx`:

```tsx
import type { CSSProperties } from 'react'
import type { Backdrop } from '../model/backdrop'

type BackdropLayerProps = { backdrop: Backdrop | null }

export function BackdropLayer({ backdrop }: BackdropLayerProps) {
  if (!backdrop) return <div style={{ ...layerStyle, background: FALLBACK }} />
  return (
    <div
      style={{
        ...layerStyle,
        backgroundImage: `url("${backdrop.url}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    />
  )
}

/** 배경을 아직 안 고른 상태에서도 유리가 유리로 보여야 한다 */
const FALLBACK = 'linear-gradient(140deg, #23303f 0%, #16202b 100%)'

const layerStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 0,
}
```

- [ ] **Step 11: 공개 API 작성**

`src/entities/backdrop/index.ts`:

```ts
export { pickBackdrop } from './api/backdrop-file'
export { backdropStore } from './model/backdrop-store'
export type { Backdrop, BackdropState } from './model/backdrop'
export { BackdropLayer } from './ui/BackdropLayer'
```

- [ ] **Step 12: 타입체크와 전체 테스트**

Run: `npm run typecheck && npm test`
Expected: 둘 다 통과

- [ ] **Step 13: 커밋**

```bash
git add -A
git commit -m "feat: 배경 이미지 선택과 워커 밝기 분석"
```

---

### Task 6: 에이전트 세션과 러너 레지스트리 (`entities/agent-session`)

세션 계약·상태·가짜 러너를 만든다. **실제 에이전트를 붙일 때 파일 1개 + 등록 1줄로 끝나는 것**이 이 태스크의 성공 기준이다.

**Files:**
- Create: `src/entities/agent-session/model/session.ts`
- Create: `src/entities/agent-session/model/session-store.ts`
- Create: `src/entities/agent-session/api/runner.ts`
- Create: `src/entities/agent-session/api/runners.ts`
- Create: `src/entities/agent-session/api/runners/fake.ts`
- Create: `src/entities/agent-session/index.ts`
- Test: `src/entities/agent-session/model/session-store.test.ts`
- Test: `src/entities/agent-session/api/runners.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `type SessionStatus = 'working' | 'waiting' | 'done'`
  - `type AgentSession = { id: string; runnerId: RunnerId; label: string; model: string; status: SessionStatus; headline: string; stream: string[]; tokens: number; contextUsed: number; startedAtMs: number }`
  - `sessionStore` — `{ get(): AgentSession[]; subscribe(fn): () => void; open(s: AgentSession): void; patch(id: string, p: Partial<AgentSession>): void; pushStream(id: string, line: string): void; clear(): void }`
  - `type AgentRunner = { id: RunnerId; label: string; model: string; start(prompt: string, sink: RunSink): RunHandle }`
  - `type RunSink = { headline(text: string): void; stream(line: string): void; meter(p: { tokens?: number; contextUsed?: number }): void; status(s: SessionStatus): void }`
  - `type RunHandle = { stop(): void }`
  - `runners: Record<RunnerId, AgentRunner>`
  - `STREAM_BUFFER = 80`

- [ ] **Step 1: 세션 계약 작성**

`src/entities/agent-session/model/session.ts`:

```ts
export type SessionStatus = 'working' | 'waiting' | 'done'

export type RunnerId = string

export type AgentSession = {
  id: string
  runnerId: RunnerId
  /** 타일 상단에 그대로 찍히는 이름 (스펙 §6 — 정체성은 글자) */
  label: string
  model: string
  status: SessionStatus
  /** 1층 — 읽는 것 */
  headline: string
  /** 2층 — 흐르는 것 */
  stream: string[]
  /** 3층 — 배경 텔레메트리 */
  tokens: number
  contextUsed: number
  startedAtMs: number
}

/** 2층 버퍼 상한. 넘으면 앞에서 버린다 — 읽으라고 있는 층이 아니다 */
export const STREAM_BUFFER = 80
```

- [ ] **Step 2: 스토어 실패 테스트 작성**

`src/entities/agent-session/model/session-store.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STREAM_BUFFER } from './session'
import type { AgentSession } from './session'
import { sessionStore } from './session-store'

function session(id: string): AgentSession {
  return {
    id,
    runnerId: 'fake',
    label: `에이전트 ${id}`,
    model: 'demo',
    status: 'working',
    headline: '',
    stream: [],
    tokens: 0,
    contextUsed: 0,
    startedAtMs: 0,
  }
}

beforeEach(() => {
  sessionStore.clear()
})

describe('sessionStore', () => {
  it('연 순서대로 세션을 유지한다', () => {
    sessionStore.open(session('a'))
    sessionStore.open(session('b'))
    expect(sessionStore.get().map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('일부 필드만 갱신한다', () => {
    sessionStore.open(session('a'))
    sessionStore.patch('a', { status: 'done', tokens: 120 })
    const found = sessionStore.get()[0]!
    expect(found.status).toBe('done')
    expect(found.tokens).toBe(120)
    expect(found.label).toBe('에이전트 a')
  })

  it('없는 id 를 갱신해도 던지지 않는다', () => {
    expect(() => sessionStore.patch('nope', { tokens: 1 })).not.toThrow()
  })

  it('스트림 버퍼가 상한을 넘지 않는다', () => {
    sessionStore.open(session('a'))
    for (let i = 0; i < STREAM_BUFFER + 25; i += 1) sessionStore.pushStream('a', `line ${i}`)
    const { stream } = sessionStore.get()[0]!
    expect(stream).toHaveLength(STREAM_BUFFER)
    expect(stream.at(-1)).toBe(`line ${STREAM_BUFFER + 24}`)
  })

  it('구독자에게 변화를 알린다', () => {
    const listener = vi.fn()
    const unsubscribe = sessionStore.subscribe(listener)
    sessionStore.open(session('a'))
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('변화가 없으면 같은 배열 참조를 돌려준다', () => {
    const before = sessionStore.get()
    expect(sessionStore.get()).toBe(before)
  })
})
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run src/entities/agent-session`
Expected: FAIL — `Failed to resolve import './session-store'`

- [ ] **Step 4: 스토어 구현**

`src/entities/agent-session/model/session-store.ts`:

```ts
import { STREAM_BUFFER } from './session'
import type { AgentSession } from './session'

type Listener = () => void

let sessions: AgentSession[] = []
const listeners = new Set<Listener>()

function emit(next: AgentSession[]): void {
  sessions = next
  for (const listener of listeners) listener()
}

export const sessionStore = {
  get(): AgentSession[] {
    return sessions
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  open(session: AgentSession): void {
    emit([...sessions, session])
  },
  patch(id: string, patch: Partial<AgentSession>): void {
    if (!sessions.some((s) => s.id === id)) return
    emit(sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  },
  pushStream(id: string, line: string): void {
    const target = sessions.find((s) => s.id === id)
    if (!target) return
    const stream = [...target.stream, line].slice(-STREAM_BUFFER)
    emit(sessions.map((s) => (s.id === id ? { ...s, stream } : s)))
  },
  clear(): void {
    emit([])
  },
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run src/entities/agent-session`
Expected: PASS (6 tests)

- [ ] **Step 6: 러너 레지스트리 실패 테스트 작성**

`src/entities/agent-session/api/runners.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import type { SessionStatus } from '../model/session'
import { runners } from './runners'

function collectingSink() {
  const lines: string[] = []
  const meters: number[] = []
  let status: SessionStatus = 'working'
  let headline = ''
  return {
    lines,
    meters,
    get status() {
      return status
    },
    get headline() {
      return headline
    },
    sink: {
      headline(text: string) {
        headline = text
      },
      stream(line: string) {
        lines.push(line)
      },
      meter({ tokens }: { tokens?: number }) {
        if (tokens !== undefined) meters.push(tokens)
      },
      status(next: SessionStatus) {
        status = next
      },
    },
  }
}

describe('runners 레지스트리', () => {
  it('모든 러너가 자기 id 로 등록돼 있다', () => {
    for (const [key, runner] of Object.entries(runners)) {
      expect(runner.id).toBe(key)
    }
  })

  it('모든 러너가 label 과 model 을 가진다', () => {
    for (const runner of Object.values(runners)) {
      expect(runner.label.length).toBeGreaterThan(0)
      expect(runner.model.length).toBeGreaterThan(0)
    }
  })

  it('가짜 러너가 등록돼 있다', () => {
    expect(runners.fake).toBeDefined()
  })
})

describe('가짜 러너', () => {
  it('시간이 지나면 로그와 지표를 밀어낸다', () => {
    vi.useFakeTimers()
    const collector = collectingSink()
    const handle = runners.fake!.start('테스트 프롬프트', collector.sink)

    vi.advanceTimersByTime(1200)
    expect(collector.lines.length).toBeGreaterThan(0)
    expect(collector.meters.length).toBeGreaterThan(0)

    handle.stop()
    const linesAtStop = collector.lines.length
    vi.advanceTimersByTime(3000)
    expect(collector.lines.length).toBe(linesAtStop)
    vi.useRealTimers()
  })

  it('stop 하면 상태가 done 이 된다', () => {
    vi.useFakeTimers()
    const collector = collectingSink()
    const handle = runners.fake!.start('테스트', collector.sink)
    handle.stop()
    expect(collector.status).toBe('done')
    vi.useRealTimers()
  })

  it('시작하자마자 1층 문구를 채운다', () => {
    vi.useFakeTimers()
    const collector = collectingSink()
    const handle = runners.fake!.start('리팩터링 해줘', collector.sink)
    expect(collector.headline.length).toBeGreaterThan(0)
    handle.stop()
    vi.useRealTimers()
  })
})
```

- [ ] **Step 7: 테스트 실패 확인**

Run: `npx vitest run src/entities/agent-session/api`
Expected: FAIL — `Failed to resolve import './runners'`

- [ ] **Step 8: 러너 계약 작성**

`src/entities/agent-session/api/runner.ts`:

```ts
import type { RunnerId, SessionStatus } from '../model/session'

/**
 * 러너가 바깥(프로세스·소켓)에서 받은 것을 도메인 이벤트로 번역해 밀어 넣는 창구.
 * 세션 객체 전체를 넘기지 않는다 — 러너가 알아야 할 것은 이 넷뿐이다.
 */
export type RunSink = {
  headline(text: string): void
  stream(line: string): void
  meter(patch: { tokens?: number; contextUsed?: number }): void
  status(next: SessionStatus): void
}

export type RunHandle = {
  stop(): void
}

export type AgentRunner = {
  id: RunnerId
  label: string
  model: string
  start(prompt: string, sink: RunSink): RunHandle
}
```

- [ ] **Step 9: 가짜 러너 구현**

`src/entities/agent-session/api/runners/fake.ts`:

```ts
import type { AgentRunner, RunHandle, RunSink } from '../runner'

/** 2층이 살아 보이는 최소 간격. 이보다 느리면 정지 화면으로 읽힌다 */
const TICK_MS = 140

const VERBS = ['읽는 중', '고치는 중', '테스트 실행', '검색', '패치 적용']
const TARGETS = [
  'src/entities/glass/model/tint.ts',
  'src/widgets/tile-deck/lib/grid.ts',
  'src/shared/lib/luminance.ts',
  'package.json',
]

export const fakeRunner: AgentRunner = {
  id: 'fake',
  label: '가짜 에이전트',
  model: 'demo-1',
  start(prompt: string, sink: RunSink): RunHandle {
    sink.headline(`"${prompt}" 작업 중`)
    sink.status('working')

    let tick = 0
    const timer = setInterval(() => {
      tick += 1
      const verb = VERBS[tick % VERBS.length]!
      const target = TARGETS[tick % TARGETS.length]!
      sink.stream(`${verb} ${target}`)
      sink.meter({
        // 틱마다 조금씩 올려서 3층 그래프가 움직이게 한다
        tokens: tick * 137,
        contextUsed: Math.min(0.95, tick * 0.012),
      })
      if (tick % 40 === 0) sink.headline(`${target} 수정함`)
    }, TICK_MS)

    return {
      stop(): void {
        clearInterval(timer)
        sink.status('done')
      },
    }
  },
}
```

- [ ] **Step 10: 레지스트리 작성**

`src/entities/agent-session/api/runners.ts`:

```ts
import type { RunnerId } from '../model/session'
import type { AgentRunner } from './runner'
import { fakeRunner } from './runners/fake'

/**
 * 러너 등록소. 실제 에이전트를 붙이려면
 * runners/<id>.ts 파일 하나를 만들고 여기 한 줄을 더한다.
 */
export const runners: Record<RunnerId, AgentRunner> = {
  [fakeRunner.id]: fakeRunner,
}
```

- [ ] **Step 11: 테스트 통과 확인**

Run: `npx vitest run src/entities/agent-session`
Expected: PASS (12 tests)

- [ ] **Step 12: 공개 API 작성**

`src/entities/agent-session/index.ts`:

```ts
export { runners } from './api/runners'
export type { AgentRunner, RunHandle, RunSink } from './api/runner'
export { STREAM_BUFFER } from './model/session'
export type { AgentSession, RunnerId, SessionStatus } from './model/session'
export { sessionStore } from './model/session-store'
```

- [ ] **Step 13: 커밋**

```bash
git add src/entities/agent-session
git commit -m "feat: 에이전트 세션 스토어와 러너 레지스트리, 가짜 러너"
```

---

### Task 7: 텔레메트리 지표 레지스트리

3층에 뿌릴 지표를 레지스트리 뒤에 둔다. 지표 추가가 파일 1개 + 등록 1줄이어야 한다.

**Files:**
- Create: `src/entities/agent-session/model/metric.ts`
- Create: `src/entities/agent-session/model/metrics.ts`
- Create: `src/entities/agent-session/model/metrics/tokens.ts`
- Create: `src/entities/agent-session/model/metrics/elapsed.ts`
- Create: `src/entities/agent-session/model/metrics/context.ts`
- Modify: `src/entities/agent-session/index.ts`
- Test: `src/entities/agent-session/model/metrics.test.ts`

**Interfaces:**
- Consumes: `AgentSession` (Task 6)
- Produces:
  - `type Metric = { id: string; label: string; unit: string; read(session: AgentSession, nowMs: number): number; format(value: number): string }`
  - `metrics: Metric[]`

- [ ] **Step 1: 실패 테스트 작성**

`src/entities/agent-session/model/metrics.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { metrics } from './metrics'
import type { AgentSession } from './session'

const session: AgentSession = {
  id: 'a',
  runnerId: 'fake',
  label: '가짜',
  model: 'demo-1',
  status: 'working',
  headline: '작업 중',
  stream: [],
  tokens: 4200,
  contextUsed: 0.42,
  startedAtMs: 1_000,
}

describe('metrics 레지스트리', () => {
  it('id 가 중복되지 않는다', () => {
    const ids = metrics.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('모든 지표가 숫자를 낸다', () => {
    for (const metric of metrics) {
      const value = metric.read(session, 4_000)
      expect(Number.isFinite(value), metric.id).toBe(true)
    }
  })

  it('모든 지표가 사람이 읽는 문자열을 낸다', () => {
    for (const metric of metrics) {
      expect(metric.format(metric.read(session, 4_000)).length, metric.id).toBeGreaterThan(0)
    }
  })

  it('토큰 지표는 세션의 tokens 를 그대로 읽는다', () => {
    const tokens = metrics.find((m) => m.id === 'tokens')!
    expect(tokens.read(session, 4_000)).toBe(4200)
  })

  it('경과 지표는 시작 시각을 뺀 초를 낸다', () => {
    const elapsed = metrics.find((m) => m.id === 'elapsed')!
    expect(elapsed.read(session, 4_000)).toBe(3)
  })

  it('컨텍스트 지표는 백분율로 낸다', () => {
    const context = metrics.find((m) => m.id === 'context')!
    expect(context.read(session, 4_000)).toBeCloseTo(42, 5)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/entities/agent-session/model/metrics.test.ts`
Expected: FAIL — `Failed to resolve import './metrics'`

- [ ] **Step 3: 지표 계약 작성**

`src/entities/agent-session/model/metric.ts`:

```ts
import type { AgentSession } from './session'

export type Metric = {
  id: string
  label: string
  unit: string
  /** nowMs 를 인자로 받는다 — 시간을 읽는 지표도 순수 함수로 남기기 위해서다 */
  read(session: AgentSession, nowMs: number): number
  format(value: number): string
}
```

- [ ] **Step 4: 지표 셋 구현**

`src/entities/agent-session/model/metrics/tokens.ts`:

```ts
import type { Metric } from '../metric'

export const tokensMetric: Metric = {
  id: 'tokens',
  label: '토큰',
  unit: 'tok',
  read: (session) => session.tokens,
  format: (value) => value.toLocaleString('ko-KR'),
}
```

`src/entities/agent-session/model/metrics/elapsed.ts`:

```ts
import type { Metric } from '../metric'

export const elapsedMetric: Metric = {
  id: 'elapsed',
  label: '경과',
  unit: 's',
  read: (session, nowMs) => Math.max(0, Math.floor((nowMs - session.startedAtMs) / 1000)),
  format: (value) => {
    const minutes = Math.floor(value / 60)
    const seconds = value % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  },
}
```

`src/entities/agent-session/model/metrics/context.ts`:

```ts
import type { Metric } from '../metric'

export const contextMetric: Metric = {
  id: 'context',
  label: '컨텍스트',
  unit: '%',
  read: (session) => session.contextUsed * 100,
  format: (value) => `${value.toFixed(0)}%`,
}
```

- [ ] **Step 5: 레지스트리 작성**

`src/entities/agent-session/model/metrics.ts`:

```ts
import type { Metric } from './metric'
import { contextMetric } from './metrics/context'
import { elapsedMetric } from './metrics/elapsed'
import { tokensMetric } from './metrics/tokens'

/**
 * 3층에 뿌릴 지표 등록소. 순서가 곧 화면 순서다.
 * 지표를 늘리려면 metrics/<id>.ts 하나를 만들고 여기 한 줄을 더한다.
 */
export const metrics: Metric[] = [tokensMetric, elapsedMetric, contextMetric]
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npx vitest run src/entities/agent-session`
Expected: PASS (18 tests)

- [ ] **Step 7: 공개 API 갱신 — `src/entities/agent-session/index.ts` 에 두 줄 추가**

```ts
export { metrics } from './model/metrics'
export type { Metric } from './model/metric'
```

- [ ] **Step 8: 커밋**

```bash
git add src/entities/agent-session
git commit -m "feat: 텔레메트리 지표 레지스트리와 기본 지표 셋"
```

---

### Task 8: 격자 배치 계산 (`widgets/tile-deck/lib`)

타일 개수를 실제 사각형 목록으로 바꾼다. **바깥 여백은 어떤 개수에서도 유지된다** — 이걸 테스트가 지킨다.

**Files:**
- Create: `src/widgets/tile-deck/lib/grid.ts`
- Test: `src/widgets/tile-deck/lib/grid.test.ts`

**Interfaces:**
- Consumes: `LAYOUT` (Task 4)
- Produces:
  - `type Rect = { x: number; y: number; w: number; h: number }` (px)
  - `type Viewport = { w: number; h: number }`
  - `layoutTiles(count: number, viewport: Viewport): Rect[]`
  - `soloRect(viewport: Viewport): Rect`

- [ ] **Step 1: 실패 테스트 작성**

`src/widgets/tile-deck/lib/grid.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { LAYOUT } from '@/shared/config/motion'
import { layoutTiles, soloRect } from './grid'

const viewport = { w: 1440, h: 900 }
const M = LAYOUT.outerMarginPx

describe('layoutTiles', () => {
  it('요청한 개수만큼 사각형을 낸다', () => {
    for (const count of [1, 2, 3, 4, 5, 6, 7, 9]) {
      expect(layoutTiles(count, viewport)).toHaveLength(count)
    }
  })

  it('0개면 빈 배열', () => {
    expect(layoutTiles(0, viewport)).toEqual([])
  })

  it('어떤 개수에서도 바깥 여백을 침범하지 않는다', () => {
    for (const count of [1, 2, 3, 4, 5, 6, 7, 8, 9, 12]) {
      for (const rect of layoutTiles(count, viewport)) {
        expect(rect.x, `count=${count}`).toBeGreaterThanOrEqual(M - 0.01)
        expect(rect.y, `count=${count}`).toBeGreaterThanOrEqual(M - 0.01)
        expect(rect.x + rect.w, `count=${count}`).toBeLessThanOrEqual(viewport.w - M + 0.01)
        expect(rect.y + rect.h, `count=${count}`).toBeLessThanOrEqual(viewport.h - M + 0.01)
      }
    }
  })

  it('타일끼리 겹치지 않는다', () => {
    const rects = layoutTiles(6, viewport)
    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        const a = rects[i]!
        const b = rects[j]!
        const overlaps =
          a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
        expect(overlaps, `${i} 와 ${j} 가 겹친다`).toBe(false)
      }
    }
  })

  it('모든 타일이 양의 크기를 가진다', () => {
    for (const rect of layoutTiles(12, viewport)) {
      expect(rect.w).toBeGreaterThan(0)
      expect(rect.h).toBeGreaterThan(0)
    }
  })

  it('5개는 첫 행에 3개, 둘째 행에 2개가 놓인다', () => {
    const rects = layoutTiles(5, viewport)
    const topRow = rects.filter((r) => r.y === rects[0]!.y)
    expect(topRow).toHaveLength(3)
  })

  it('2개는 가로로 나란히 놓인다 — 화면이 가로로 넓다', () => {
    const rects = layoutTiles(2, viewport)
    expect(rects[0]!.y).toBe(rects[1]!.y)
    expect(rects[0]!.x).toBeLessThan(rects[1]!.x)
  })

  it('같은 입력이면 같은 출력이다', () => {
    expect(layoutTiles(4, viewport)).toEqual(layoutTiles(4, viewport))
  })
})

describe('soloRect', () => {
  it('화면의 약 80%를 차지한다', () => {
    const rect = soloRect(viewport)
    expect(rect.w / viewport.w).toBeCloseTo(0.8, 2)
    expect(rect.h / viewport.h).toBeCloseTo(0.8, 2)
  })

  it('가운데 정렬된다', () => {
    const rect = soloRect(viewport)
    expect(rect.x).toBeCloseTo(viewport.w - (rect.x + rect.w), 5)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/widgets/tile-deck`
Expected: FAIL — `Failed to resolve import './grid'`

- [ ] **Step 3: grid.ts 구현**

```ts
import { LAYOUT } from '@/shared/config/motion'

export type Rect = { x: number; y: number; w: number; h: number }
export type Viewport = { w: number; h: number }

/**
 * 타일 개수를 격자 사각형으로 바꾼다.
 * 바깥 여백은 어떤 개수에서도 유지된다 — 배경이 보여야 하기 때문이다 (스펙 §2.2).
 */
export function layoutTiles(count: number, viewport: Viewport): Rect[] {
  if (count <= 0) return []

  const { outerMarginPx: margin, gapPx: gap } = LAYOUT
  const areaW = viewport.w - margin * 2
  const areaH = viewport.h - margin * 2
  // 열을 먼저 정하고 행을 채운다 — 화면이 가로로 넓어서 2개는 나란히 놓여야 한다
  const maxCols = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / maxCols)
  const rowH = (areaH - gap * (rows - 1)) / rows

  const rects: Rect[] = []
  let placed = 0
  for (let row = 0; row < rows; row += 1) {
    // 남은 타일을 남은 행에 고르게 나눈다 — 마지막 행만 비는 격자를 피한다
    const cols = Math.ceil((count - placed) / (rows - row))
    const colW = (areaW - gap * (cols - 1)) / cols
    for (let col = 0; col < cols; col += 1) {
      rects.push({
        x: margin + col * (colW + gap),
        y: margin + row * (rowH + gap),
        w: colW,
        h: rowH,
      })
    }
    placed += cols
  }
  return rects
}

/** Solo 한 장의 자리. 사방에 여백을 남겨 배경이 숨 쉬게 한다 (스펙 §2.1) */
export function soloRect(viewport: Viewport): Rect {
  const inset = LAYOUT.soloInsetRatio
  return {
    x: viewport.w * inset,
    y: viewport.h * inset,
    w: viewport.w * (1 - inset * 2),
    h: viewport.h * (1 - inset * 2),
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/widgets/tile-deck`
Expected: PASS (9 tests)

여백 침범 테스트가 실패하면 `areaW`/`areaH` 계산과 `margin` 적용을 본다. **테스트의 여백 기대치를 낮추지 않는다.**

- [ ] **Step 5: 커밋**

```bash
git add src/widgets/tile-deck
git commit -m "feat: 타일 격자 배치 계산, 바깥 여백 보장"
```

---

### Task 9: 셸 상태 머신 (`widgets/tile-deck/model`)

`solo → fanning → fanned → merging → solo` 전이를 표로 만든다. **금지된 전이가 조용히 무시되는 것**이 이 태스크의 핵심이다.

**Files:**
- Create: `src/widgets/tile-deck/model/deck-machine.ts`
- Test: `src/widgets/tile-deck/model/deck-machine.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `type DeckState = { kind: 'solo' } | { kind: 'fanning'; ids: string[] } | { kind: 'fanned'; ids: string[] } | { kind: 'merging'; ids: string[] }`
  - `type DeckEvent = { type: 'launch'; ids: string[] } | { type: 'fanSettled' } | { type: 'closeOne'; id: string } | { type: 'mergeSettled' }`
  - `INITIAL_DECK: DeckState`
  - `deckReducer(state: DeckState, event: DeckEvent): DeckState`
  - `visibleIds(state: DeckState): string[]`

- [ ] **Step 1: 실패 테스트 작성**

`src/widgets/tile-deck/model/deck-machine.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { INITIAL_DECK, deckReducer, visibleIds } from './deck-machine'
import type { DeckState } from './deck-machine'

const fanned: DeckState = { kind: 'fanned', ids: ['a', 'b', 'c'] }

describe('deckReducer', () => {
  it('초기 상태는 solo 다', () => {
    expect(INITIAL_DECK.kind).toBe('solo')
  })

  it('solo 에서 launch 하면 fanning 으로 간다', () => {
    const next = deckReducer(INITIAL_DECK, { type: 'launch', ids: ['a', 'b'] })
    expect(next).toEqual({ kind: 'fanning', ids: ['a', 'b'] })
  })

  it('빈 목록으로 launch 하면 solo 에 머문다', () => {
    expect(deckReducer(INITIAL_DECK, { type: 'launch', ids: [] })).toBe(INITIAL_DECK)
  })

  it('fanning 이 끝나면 fanned 가 된다', () => {
    const fanning: DeckState = { kind: 'fanning', ids: ['a'] }
    expect(deckReducer(fanning, { type: 'fanSettled' })).toEqual({ kind: 'fanned', ids: ['a'] })
  })

  it('전환 중 launch 는 무시된다', () => {
    const fanning: DeckState = { kind: 'fanning', ids: ['a'] }
    expect(deckReducer(fanning, { type: 'launch', ids: ['x'] })).toBe(fanning)

    const merging: DeckState = { kind: 'merging', ids: [] }
    expect(deckReducer(merging, { type: 'launch', ids: ['x'] })).toBe(merging)
  })

  it('fanned 에서 launch 는 무시된다 — 돌아가는 판을 갈아엎지 않는다', () => {
    expect(deckReducer(fanned, { type: 'launch', ids: ['x'] })).toBe(fanned)
  })

  it('타일 하나를 닫으면 나머지가 남는다', () => {
    const next = deckReducer(fanned, { type: 'closeOne', id: 'b' })
    expect(next).toEqual({ kind: 'fanned', ids: ['a', 'c'] })
  })

  it('마지막 타일을 닫으면 merging 으로 간다', () => {
    const one: DeckState = { kind: 'fanned', ids: ['a'] }
    expect(deckReducer(one, { type: 'closeOne', id: 'a' })).toEqual({ kind: 'merging', ids: [] })
  })

  it('없는 id 를 닫아도 상태가 그대로다', () => {
    expect(deckReducer(fanned, { type: 'closeOne', id: 'zzz' })).toBe(fanned)
  })

  it('merging 이 끝나면 solo 로 돌아온다', () => {
    const merging: DeckState = { kind: 'merging', ids: [] }
    expect(deckReducer(merging, { type: 'mergeSettled' }).kind).toBe('solo')
  })

  it('표에 없는 (상태, 이벤트) 는 같은 참조를 돌려준다', () => {
    expect(deckReducer(INITIAL_DECK, { type: 'fanSettled' })).toBe(INITIAL_DECK)
    expect(deckReducer(INITIAL_DECK, { type: 'closeOne', id: 'a' })).toBe(INITIAL_DECK)
    expect(deckReducer(fanned, { type: 'mergeSettled' })).toBe(fanned)
  })

  it('한 판을 처음부터 끝까지 돌린다', () => {
    let state = deckReducer(INITIAL_DECK, { type: 'launch', ids: ['a', 'b'] })
    state = deckReducer(state, { type: 'fanSettled' })
    state = deckReducer(state, { type: 'closeOne', id: 'a' })
    state = deckReducer(state, { type: 'closeOne', id: 'b' })
    expect(state.kind).toBe('merging')
    state = deckReducer(state, { type: 'mergeSettled' })
    expect(state.kind).toBe('solo')
  })
})

describe('visibleIds', () => {
  it('solo 에서는 비어 있다', () => {
    expect(visibleIds(INITIAL_DECK)).toEqual([])
  })

  it('전환 중에도 타일 목록을 낸다 — 그려야 움직인다', () => {
    expect(visibleIds({ kind: 'fanning', ids: ['a'] })).toEqual(['a'])
    expect(visibleIds(fanned)).toEqual(['a', 'b', 'c'])
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/widgets/tile-deck/model`
Expected: FAIL — `Failed to resolve import './deck-machine'`

- [ ] **Step 3: deck-machine.ts 구현**

```ts
/**
 * 셸 전이 (스펙 §2).
 * 플래그 두 개로 두면 isFanning && isMerging 이 표현 가능해진다 — 그래서 union 이다.
 */
export type DeckState =
  | { kind: 'solo' }
  | { kind: 'fanning'; ids: string[] }
  | { kind: 'fanned'; ids: string[] }
  | { kind: 'merging'; ids: string[] }

export type DeckEvent =
  | { type: 'launch'; ids: string[] }
  | { type: 'fanSettled' }
  | { type: 'closeOne'; id: string }
  | { type: 'mergeSettled' }

export const INITIAL_DECK: DeckState = { kind: 'solo' }

/** 표에 없는 (상태, 이벤트) 는 현재 상태를 그대로 돌려준다 */
export function deckReducer(state: DeckState, event: DeckEvent): DeckState {
  switch (state.kind) {
    case 'solo':
      if (event.type === 'launch' && event.ids.length > 0) {
        return { kind: 'fanning', ids: event.ids }
      }
      return state

    case 'fanning':
      if (event.type === 'fanSettled') return { kind: 'fanned', ids: state.ids }
      return state

    case 'fanned': {
      if (event.type !== 'closeOne') return state
      if (!state.ids.includes(event.id)) return state
      const ids = state.ids.filter((id) => id !== event.id)
      return ids.length === 0 ? { kind: 'merging', ids } : { kind: 'fanned', ids }
    }

    case 'merging':
      if (event.type === 'mergeSettled') return INITIAL_DECK
      return state
  }
}

export function visibleIds(state: DeckState): string[] {
  return state.kind === 'solo' ? [] : state.ids
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/widgets/tile-deck`
Expected: PASS (23 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/widgets/tile-deck
git commit -m "feat: 셸 상태 머신 — solo/fanning/fanned/merging 전이표"
```

---

### Task 10: 타일 3층과 물 전환 (`widgets/tile-deck/ui`)

타일을 실제로 그리고 물처럼 갈라지게 한다. 이 앱의 시그니처 3초가 여기서 나온다.

**Files:**
- Create: `src/widgets/tile-deck/model/use-deck.ts`
- Create: `src/widgets/tile-deck/ui/layers/Headline.tsx`
- Create: `src/widgets/tile-deck/ui/layers/Stream.tsx`
- Create: `src/widgets/tile-deck/ui/layers/Telemetry.tsx`
- Create: `src/widgets/tile-deck/ui/AgentTile.tsx`
- Create: `src/widgets/tile-deck/ui/TileDeck.tsx`
- Create: `src/widgets/tile-deck/index.ts`
- Test: `src/widgets/tile-deck/ui/AgentTile.test.tsx`

**Interfaces:**
- Consumes: `GlassPane` · `GlassTint` (Task 4), `AgentSession` · `metrics` · `sessionStore` (Task 6·7), `layoutTiles` · `soloRect` · `Rect` (Task 8), `deckReducer` · `DeckState` · `visibleIds` (Task 9), `MOTION` · `staggerDelay` (Task 4)
- Produces:
  - `useDeck()` → `{ state: DeckState; launch(ids: string[]): void; closeOne(id: string): void }`
  - `<TileDeck state sessions tintFor viewport nowMs soloContent />` — `tintFor(unit: UnitRect): GlassTint`

- [ ] **Step 1: 소비 훅 작성**

`src/widgets/tile-deck/model/use-deck.ts`:

```ts
import { useCallback, useEffect, useReducer } from 'react'
import { MOTION } from '@/shared/config/motion'
import { INITIAL_DECK, deckReducer } from './deck-machine'
import type { DeckState } from './deck-machine'

type Deck = {
  state: DeckState
  launch(ids: string[]): void
  closeOne(id: string): void
}

/**
 * 전환이 끝나는 시점을 타이머로 알린다.
 * 전이를 일으키는 것은 언제나 reducer 이고, 훅은 이름 붙인 의도 둘만 밖으로 낸다.
 */
export function useDeck(): Deck {
  const [state, dispatch] = useReducer(deckReducer, INITIAL_DECK)

  useEffect(() => {
    if (state.kind === 'fanning') {
      const timer = setTimeout(() => dispatch({ type: 'fanSettled' }), MOTION.fanMs)
      return () => clearTimeout(timer)
    }
    if (state.kind === 'merging') {
      const timer = setTimeout(() => dispatch({ type: 'mergeSettled' }), MOTION.mergeMs)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [state.kind])

  const launch = useCallback((ids: string[]) => dispatch({ type: 'launch', ids }), [])
  const closeOne = useCallback((id: string) => dispatch({ type: 'closeOne', id }), [])

  return { state, launch, closeOne }
}
```

- [ ] **Step 2: 1층 — Headline**

`src/widgets/tile-deck/ui/layers/Headline.tsx`:

```tsx
import type { CSSProperties } from 'react'
import type { AgentSession } from '@/entities/agent-session'

type HeadlineProps = { session: AgentSession }

/** 1층 — 읽는 것. 전면, 최대 명료도, 애니메이션 없음 (스펙 §5.1) */
export function Headline({ session }: HeadlineProps) {
  return (
    <div style={rootStyle}>
      <div style={nameStyle}>
        {session.label}
        <span style={modelStyle}>{session.model}</span>
      </div>
      <div style={textStyle}>{session.headline}</div>
    </div>
  )
}

const rootStyle: CSSProperties = { position: 'relative', zIndex: 3 }

const nameStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 8,
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: '0.02em',
}

const modelStyle: CSSProperties = { fontSize: 11, opacity: 0.55, fontWeight: 400 }

const textStyle: CSSProperties = { marginTop: 10, fontSize: 17, lineHeight: 1.45 }
```

- [ ] **Step 3: 2층 — Stream**

`src/widgets/tile-deck/ui/layers/Stream.tsx`:

```tsx
import type { CSSProperties } from 'react'

type StreamProps = { lines: string[] }

/** 2층 — 흐르는 것. 읽으라고 있는 게 아니라 살아있다는 증거다 (스펙 §5.2) */
export function Stream({ lines }: StreamProps) {
  return (
    <div style={rootStyle}>
      {lines.slice(-14).map((line, index, shown) => (
        <div
          key={`${index}-${line}`}
          style={{
            ...lineStyle,
            // 오래된 줄일수록 옅어져 흐름의 방향이 읽힌다
            opacity: 0.25 + (0.75 * (index + 1)) / shown.length,
          }}
        >
          {line}
        </div>
      ))}
    </div>
  )
}

const rootStyle: CSSProperties = {
  position: 'relative',
  zIndex: 2,
  marginTop: 16,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 11,
  lineHeight: 1.6,
  /** 2층 전체 밝기 — 스펙 §5.2 의 60% */
  opacity: 0.6,
  overflow: 'hidden',
  maskImage: 'linear-gradient(180deg, transparent 0%, #000 30%, #000 100%)',
}

const lineStyle: CSSProperties = { whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }
```

- [ ] **Step 4: 3층 — Telemetry**

`src/widgets/tile-deck/ui/layers/Telemetry.tsx`:

```tsx
import type { CSSProperties } from 'react'
import type { AgentSession } from '@/entities/agent-session'
import { metrics } from '@/entities/agent-session'

type TelemetryProps = { session: AgentSession; nowMs: number }

/** 3층 — 유리 뒤에 깔리는 데이터 레이어. 초점을 맞추면 읽히고 아니면 질감이다 (스펙 §5.3) */
export function Telemetry({ session, nowMs }: TelemetryProps) {
  return (
    <div style={rootStyle}>
      {metrics.map((metric) => (
        <div key={metric.id} style={itemStyle}>
          <span style={labelStyle}>{metric.label}</span>
          <span style={valueStyle}>{metric.format(metric.read(session, nowMs))}</span>
        </div>
      ))}
    </div>
  )
}

const rootStyle: CSSProperties = {
  position: 'absolute',
  right: 20,
  bottom: 18,
  zIndex: 1,
  display: 'flex',
  gap: 18,
  /** 스펙 §5.3 의 25% */
  opacity: 0.25,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontVariantNumeric: 'tabular-nums',
  pointerEvents: 'none',
}

const itemStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2 }
const labelStyle: CSSProperties = { fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase' }
const valueStyle: CSSProperties = { fontSize: 15 }
```

- [ ] **Step 5: AgentTile 실패 테스트 작성**

`src/widgets/tile-deck/ui/AgentTile.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import { computeTint } from '@/entities/glass'
import { AgentTile } from './AgentTile'

const tint = computeTint(0.8, 0.5)
const rect = { x: 48, y: 48, w: 600, h: 380 }

function session(overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id: 'a',
    runnerId: 'fake',
    label: '가짜 에이전트',
    model: 'demo-1',
    status: 'working',
    headline: '타일을 만드는 중',
    stream: ['읽는 중 a.ts', '고치는 중 b.ts'],
    tokens: 1200,
    contextUsed: 0.3,
    startedAtMs: 0,
    ...overrides,
  }
}

describe('AgentTile', () => {
  it('세 층을 모두 그린다', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} tint={tint} rect={rect} delayMs={0} nowMs={5000} />,
    )
    expect(html).toContain('가짜 에이전트')
    expect(html).toContain('타일을 만드는 중')
    expect(html).toContain('고치는 중 b.ts')
    expect(html).toContain('토큰')
  })

  it('사각형을 좌표로 반영한다', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} tint={tint} rect={rect} delayMs={0} nowMs={0} />,
    )
    expect(html).toContain('600px')
    expect(html).toContain('380px')
  })

  it('스태거 지연을 스타일에 싣는다', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} tint={tint} rect={rect} delayMs={120} nowMs={0} />,
    )
    expect(html).toContain('120ms')
  })

  it('입력 대기 상태를 표시로 구분한다', () => {
    const waiting = renderToStaticMarkup(
      <AgentTile session={session({ status: 'waiting' })} tint={tint} rect={rect} delayMs={0} nowMs={0} />,
    )
    expect(waiting).toContain('data-status="waiting"')
  })

  it('갈라지는 동안에만 경계 섬광을 그린다', () => {
    const sweeping = renderToStaticMarkup(
      <AgentTile session={session()} tint={tint} rect={rect} delayMs={0} nowMs={0} sweeping />,
    )
    expect(sweeping).toContain('data-sweep')

    const still = renderToStaticMarkup(
      <AgentTile session={session()} tint={tint} rect={rect} delayMs={0} nowMs={0} />,
    )
    expect(still).not.toContain('data-sweep')
  })

  it('전환 중에는 2층을 멈춘다 — 움직임은 한 번에 하나만', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} tint={tint} rect={rect} delayMs={0} nowMs={0} sweeping />,
    )
    expect(html).not.toContain('고치는 중 b.ts')
  })
})
```

- [ ] **Step 6: 테스트 실패 확인**

Run: `npx vitest run src/widgets/tile-deck/ui`
Expected: FAIL — `Failed to resolve import './AgentTile'`

- [ ] **Step 7: AgentTile 구현**

```tsx
import type { CSSProperties } from 'react'
import type { AgentSession } from '@/entities/agent-session'
import { GlassPane } from '@/entities/glass'
import type { GlassTint } from '@/entities/glass'
import { MOTION } from '@/shared/config/motion'
import type { Rect } from '../lib/grid'
import { Headline } from './layers/Headline'
import { Stream } from './layers/Stream'
import { Telemetry } from './layers/Telemetry'

type AgentTileProps = {
  session: AgentSession
  tint: GlassTint
  rect: Rect
  delayMs: number
  nowMs: number
  /** 갈라지거나 닫히는 중. 경계 섬광을 켜고 2층을 멈춘다 */
  sweeping?: boolean
}

export function AgentTile({ session, tint, rect, delayMs, nowMs, sweeping = false }: AgentTileProps) {
  return (
    <div
      data-status={session.status}
      style={{
        ...positionStyle,
        transform: `translate(${rect.x}px, ${rect.y}px)`,
        width: rect.w,
        height: rect.h,
        transition: `transform ${MOTION.fanMs}ms ${MOTION.easing} ${delayMs}ms, width ${MOTION.fanMs}ms ${MOTION.easing} ${delayMs}ms, height ${MOTION.fanMs}ms ${MOTION.easing} ${delayMs}ms, opacity ${MOTION.mergeMs}ms ${MOTION.easing}`,
      }}
    >
      <GlassPane tint={tint} style={{ height: '100%', padding: 22 }}>
        {session.status === 'working' && !sweeping && <div style={rippleStyle} />}
        {session.status === 'waiting' && <div style={pulseStyle} />}
        {sweeping && <div data-sweep style={sweepStyle} />}
        <Headline session={session} />
        {/* 전환 중에는 2층을 멈춘다 — 500ms 동안 움직임은 하나만 돈다 (스펙 §6.5) */}
        {!sweeping && <Stream lines={session.stream} />}
        <Telemetry session={session} nowMs={nowMs} />
      </GlassPane>
    </div>
  )
}

const positionStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  willChange: 'transform, width, height',
}

/** 작업 중 타일의 표면 일렁임. 시선을 끌지 않는 강도로 유지한다 (스펙 §6) */
const rippleStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background:
    'radial-gradient(120% 80% at 50% 120%, rgba(255,255,255,0.10) 0%, transparent 60%)',
  animation: 'tile-ripple 4.5s ease-in-out infinite',
  pointerEvents: 'none',
}

/** 사람을 기다리는 타일만 능동적으로 시선을 끈다 (스펙 §6 시선 규칙) */
const pulseStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  borderRadius: 18,
  border: '1px solid rgba(255,255,255,0.75)',
  animation: 'tile-pulse 2.4s ease-in-out infinite',
  pointerEvents: 'none',
}

/** 경계 섬광 — 갈라진 선을 빛이 한 번 훑는다. "촥" 을 시각으로 낸 것 (스펙 §3) */
const sweepStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background:
    'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.55) 50%, transparent 65%)',
  animation: `tile-sweep ${MOTION.fanMs}ms ${MOTION.easing} 1`,
  pointerEvents: 'none',
  zIndex: 4,
}
```

- [ ] **Step 8: 애니메이션 키프레임을 전역 스타일에 추가**

`src/app/styles/global.css` 끝에 붙인다:

```css
@keyframes tile-ripple {
  0%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }
  50% {
    opacity: 0.85;
    transform: translateY(-6px);
  }
}

@keyframes tile-pulse {
  0%,
  100% {
    opacity: 0.25;
  }
  50% {
    opacity: 0.9;
  }
}

@keyframes tile-sweep {
  from {
    transform: translateX(-120%);
    opacity: 0;
  }
  35% {
    opacity: 1;
  }
  to {
    transform: translateX(120%);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition-duration: 1ms !important;
  }
}
```

- [ ] **Step 9: 테스트 통과 확인**

Run: `npx vitest run src/widgets/tile-deck/ui`
Expected: PASS (4 tests)

- [ ] **Step 10: TileDeck 구현**

`src/widgets/tile-deck/ui/TileDeck.tsx`:

```tsx
import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { AgentSession } from '@/entities/agent-session'
import { GlassPane } from '@/entities/glass'
import type { GlassTint } from '@/entities/glass'
import { MOTION, staggerDelay } from '@/shared/config/motion'
import type { UnitRect } from '@/shared/lib/luminance'
import { layoutTiles, soloRect } from '../lib/grid'
import type { Rect, Viewport } from '../lib/grid'
import type { DeckState } from '../model/deck-machine'
import { visibleIds } from '../model/deck-machine'
import { AgentTile } from './AgentTile'

type TileDeckProps = {
  state: DeckState
  sessions: AgentSession[]
  /** 타일이 놓인 자리의 배경 밝기로 계산된 틴트 (스펙 §4.1) */
  tintFor(unit: UnitRect): GlassTint
  viewport: Viewport
  nowMs: number
  soloContent: ReactNode
}

export function TileDeck({
  state,
  sessions,
  tintFor,
  viewport,
  nowMs,
  soloContent,
}: TileDeckProps) {
  const shown = visibleIds(state)
    .map((id) => sessions.find((s) => s.id === id))
    .filter((s): s is AgentSession => s !== undefined)

  const solo = soloRect(viewport)
  const spread = useSpread(state.kind)
  const sweeping = state.kind === 'fanning' || state.kind === 'merging'

  // fanning 은 solo 자리에서 한 프레임 머문 뒤 격자로 퍼진다 — 그래야 갈라지는 것으로 보인다
  const atGrid = spread || state.kind === 'fanned'
  const rects = atGrid ? layoutTiles(shown.length, viewport) : shown.map(() => solo)

  const soloVisible = state.kind !== 'fanned'
  const soloTint = tintFor(toUnit(solo, viewport))

  return (
    <div style={rootStyle}>
      {soloVisible && (
        <div
          style={{
            ...positionStyle,
            transform: `translate(${solo.x}px, ${solo.y}px)`,
            width: solo.w,
            height: solo.h,
            // 타일이 퍼져 나가는 동안 아래의 한 장은 물러난다
            opacity: state.kind === 'fanning' && spread ? 0 : 1,
            transition: `opacity ${MOTION.fanMs}ms ${MOTION.easing}`,
            pointerEvents: state.kind === 'solo' ? 'auto' : 'none',
          }}
        >
          <GlassPane tint={soloTint} style={{ height: '100%', padding: 28 }}>
            {soloContent}
          </GlassPane>
        </div>
      )}
      {shown.map((session, index) => {
        const rect = rects[index] ?? solo
        return (
          <AgentTile
            key={session.id}
            session={session}
            tint={tintFor(toUnit(rect, viewport))}
            rect={rect}
            delayMs={staggerDelay(index)}
            nowMs={nowMs}
            sweeping={sweeping}
          />
        )
      })}
    </div>
  )
}

/** fanning 진입 다음 프레임에 true 가 된다. 두 프레임이 있어야 CSS 전환이 걸린다 */
function useSpread(kind: DeckState['kind']): boolean {
  const [spread, setSpread] = useState(false)

  useEffect(() => {
    if (kind === 'fanning') {
      setSpread(false)
      const frame = requestAnimationFrame(() => setSpread(true))
      return () => cancelAnimationFrame(frame)
    }
    if (kind === 'solo') setSpread(false)
    return undefined
  }, [kind])

  return spread
}

function toUnit(rect: Rect, viewport: Viewport): UnitRect {
  return {
    x: rect.x / viewport.w,
    y: rect.y / viewport.h,
    w: rect.w / viewport.w,
    h: rect.h / viewport.h,
  }
}

const rootStyle: CSSProperties = { position: 'fixed', inset: 0, zIndex: 1 }

const positionStyle: CSSProperties = { position: 'absolute', top: 0, left: 0 }
```

- [ ] **Step 11: 공개 API 작성**

`src/widgets/tile-deck/index.ts`:

```ts
export type { Rect, Viewport } from './lib/grid'
export type { DeckState } from './model/deck-machine'
export { useDeck } from './model/use-deck'
export { TileDeck } from './ui/TileDeck'
```

- [ ] **Step 12: 타입체크와 전체 테스트**

Run: `npm run typecheck && npm test`
Expected: 둘 다 통과

- [ ] **Step 13: 커밋**

```bash
git add -A
git commit -m "feat: 타일 3층 렌더와 물 문법 전환"
```

---

### Task 11: 워크스페이스 조립 (`pages/workspace`)

배경·유리·덱·컨트롤을 하나로 엮어 실제로 동작하는 앱을 만든다.

**Files:**
- Create: `src/pages/workspace/model/use-glass-tint.ts`
- Create: `src/pages/workspace/model/use-fleet.ts`
- Create: `src/pages/workspace/ui/controls/BackdropPicker.tsx`
- Create: `src/pages/workspace/ui/controls/GlassThickness.tsx`
- Create: `src/pages/workspace/ui/WorkspaceScreen.tsx`
- Create: `src/pages/workspace/index.ts`
- Modify: `src/app/main.tsx`

**Interfaces:**
- Consumes: 전 태스크의 공개 API 전부
- Produces: `<WorkspaceScreen />` — 앱의 유일한 화면

- [ ] **Step 1: 틴트 소비 훅**

`src/pages/workspace/model/use-glass-tint.ts`:

```ts
import { useCallback, useSyncExternalStore } from 'react'
import { backdropStore } from '@/entities/backdrop'
import { computeTint } from '@/entities/glass'
import type { GlassTint } from '@/entities/glass'
import { luminanceOfRect } from '@/shared/lib/luminance'
import type { UnitRect } from '@/shared/lib/luminance'

type GlassTintSource = {
  /** 그 자리의 배경 밝기로 틴트를 낸다 — 창을 옮기면 틴트가 따라온다 (스펙 §4.1) */
  tintFor(unit: UnitRect): GlassTint
  thickness: number
}

/** 배경이 없을 때 폴백 그라디언트의 대표 밝기 */
const FALLBACK_LUMINANCE = 0.12

/**
 * 배경 슬라이스와 유리 슬라이스를 읽어 합친다.
 * 두 entities 를 함께 읽으므로 이 소비는 위 레이어(pages)의 것이다.
 */
export function useGlassTint(): GlassTintSource {
  const state = useSyncExternalStore(backdropStore.subscribe, backdropStore.get, backdropStore.get)
  const { backdrop, thickness } = state

  const tintFor = useCallback(
    (unit: UnitRect): GlassTint => {
      const luminance = backdrop ? luminanceOfRect(backdrop.profile, unit) : FALLBACK_LUMINANCE
      return computeTint(luminance, thickness)
    },
    [backdrop, thickness],
  )

  return { tintFor, thickness }
}
```

- [ ] **Step 2: 함대 실행 훅**

`src/pages/workspace/model/use-fleet.ts`:

```ts
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { runners, sessionStore } from '@/entities/agent-session'
import type { AgentSession, RunHandle } from '@/entities/agent-session'

/** 3층 경과 시간이 흐르게 하는 갱신 주기. 초 단위 표시라 1초면 충분하다 */
const CLOCK_MS = 1000

type Fleet = {
  sessions: AgentSession[]
  nowMs: number
  launch(count: number): string[]
  stop(id: string): void
}

export function useFleet(): Fleet {
  const sessions = useSyncExternalStore(sessionStore.subscribe, sessionStore.get, sessionStore.get)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const handles = useRef(new Map<string, RunHandle>())

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), CLOCK_MS)
    return () => clearInterval(timer)
  }, [])

  const launch = useCallback((count: number): string[] => {
    sessionStore.clear()
    for (const handle of handles.current.values()) handle.stop()
    handles.current.clear()

    const runner = runners.fake
    if (!runner) throw new Error('가짜 러너가 등록되지 않았다')

    const ids: string[] = []
    for (let i = 0; i < count; i += 1) {
      const id = `session-${i}`
      ids.push(id)
      sessionStore.open({
        id,
        runnerId: runner.id,
        label: `${runner.label} ${i + 1}`,
        model: runner.model,
        status: 'working',
        headline: '',
        stream: [],
        tokens: 0,
        contextUsed: 0,
        startedAtMs: Date.now(),
      })
      handles.current.set(
        id,
        runner.start('유리 타일 셸 만들기', {
          headline: (text) => sessionStore.patch(id, { headline: text }),
          stream: (line) => sessionStore.pushStream(id, line),
          meter: (patch) => sessionStore.patch(id, patch),
          status: (status) => sessionStore.patch(id, { status }),
        }),
      )
    }
    return ids
  }, [])

  const stop = useCallback((id: string) => {
    handles.current.get(id)?.stop()
    handles.current.delete(id)
  }, [])

  return { sessions, nowMs, launch, stop }
}
```

- [ ] **Step 3: 컨트롤 둘**

`src/pages/workspace/ui/controls/BackdropPicker.tsx`:

```tsx
import { backdropStore, pickBackdrop } from '@/entities/backdrop'

export function BackdropPicker() {
  async function handleClick(): Promise<void> {
    const backdrop = await pickBackdrop()
    if (backdrop) backdropStore.set(backdrop)
  }

  return (
    <button type="button" onClick={handleClick} style={buttonStyle}>
      배경 고르기
    </button>
  )
}

const buttonStyle = {
  padding: '8px 14px',
  borderRadius: 10,
  border: '1px solid currentColor',
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  fontSize: 13,
  cursor: 'pointer',
} as const
```

`src/pages/workspace/ui/controls/GlassThickness.tsx`:

```tsx
import { backdropStore } from '@/entities/backdrop'

type GlassThicknessProps = { value: number }

/** 사용자에게 주는 유일한 노브 (스펙 §4.3) */
export function GlassThickness({ value }: GlassThicknessProps) {
  return (
    <label style={labelStyle}>
      유리 두께
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(event) => backdropStore.setThickness(Number(event.target.value))}
      />
    </label>
  )
}

const labelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  fontSize: 13,
} as const
```

- [ ] **Step 4: 화면 조립**

`src/pages/workspace/ui/WorkspaceScreen.tsx`:

```tsx
import { useEffect, useState, useSyncExternalStore } from 'react'
import type { CSSProperties } from 'react'
import { BackdropLayer, backdropStore } from '@/entities/backdrop'
import { TileDeck, useDeck } from '@/widgets/tile-deck'
import { useFleet } from '../model/use-fleet'
import { useGlassTint } from '../model/use-glass-tint'
import { BackdropPicker } from './controls/BackdropPicker'
import { GlassThickness } from './controls/GlassThickness'

/** v1 의 기본 함대 크기. 60fps 판정 기준과 같은 수다 (스펙 §6.5) */
const FLEET_SIZE = 6

export function WorkspaceScreen() {
  const { tintFor, thickness } = useGlassTint()
  const { sessions, nowMs, launch, stop } = useFleet()
  const { state, launch: fanOut, closeOne } = useDeck()
  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  const backdrop = useSyncExternalStore(
    backdropStore.subscribe,
    backdropStore.get,
    backdropStore.get,
  ).backdrop

  useEffect(() => {
    function onResize(): void {
      setViewport({ w: window.innerWidth, h: window.innerHeight })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function handleLaunch(): void {
    fanOut(launch(FLEET_SIZE))
  }

  function handleCloseOne(): void {
    const target = sessions.find((s) => s.status !== 'done')
    if (!target) return
    stop(target.id)
    closeOne(target.id)
  }

  return (
    <>
      <BackdropLayer backdrop={backdrop} />
      <TileDeck
        state={state}
        sessions={sessions}
        tintFor={tintFor}
        viewport={viewport}
        nowMs={nowMs}
        soloContent={
          <div style={soloStyle}>
            <div style={{ fontSize: 20 }}>준비됨</div>
            <div style={controlsStyle}>
              <BackdropPicker />
              <GlassThickness value={thickness} />
              <button type="button" onClick={handleLaunch} style={primaryStyle}>
                {FLEET_SIZE}개 띄우기
              </button>
            </div>
          </div>
        }
      />
      {state.kind === 'fanned' && (
        <button type="button" onClick={handleCloseOne} style={floatingStyle}>
          하나 닫기
        </button>
      )}
    </>
  )
}

const soloStyle: CSSProperties = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
}

const controlsStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 16 }

const primaryStyle: CSSProperties = {
  padding: '8px 16px',
  borderRadius: 10,
  border: '1px solid currentColor',
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  fontSize: 13,
  cursor: 'pointer',
}

const floatingStyle: CSSProperties = {
  position: 'fixed',
  right: 24,
  bottom: 24,
  zIndex: 5,
  padding: '8px 14px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.5)',
  background: 'rgba(0,0,0,0.35)',
  color: '#fff',
  font: 'inherit',
  fontSize: 13,
  cursor: 'pointer',
}
```

- [ ] **Step 5: 공개 API 와 진입점 연결**

`src/pages/workspace/index.ts`:

```ts
export { WorkspaceScreen } from './ui/WorkspaceScreen'
```

`src/app/main.tsx` 전체를 아래로 교체:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WorkspaceScreen } from '@/pages/workspace'
import './styles/global.css'

const root = document.getElementById('root')
if (!root) throw new Error('#root 를 찾지 못했다')

createRoot(root).render(
  <StrictMode>
    <WorkspaceScreen />
  </StrictMode>,
)
```

- [ ] **Step 6: 타입체크와 전체 테스트**

Run: `npm run typecheck && npm test`
Expected: 둘 다 통과

- [ ] **Step 7: 시각 체크포인트 — 전체 흐름**

Run: `npm run dev`

순서대로 확인한다:
1. Solo 한 장이 화면 80%로 떠 있고 사방에 여백이 있다
2. "배경 고르기" → 이미지를 고르면 배경이 깔리고 **유리 색과 글씨 색이 배경에 맞춰 바뀐다**
3. 밝은 사진과 어두운 사진을 각각 넣어보고 **양쪽에서 글씨가 읽히는지** 확인한다
4. "유리 두께" 슬라이더를 양 끝까지 밀어도 글씨가 읽힌다
5. "6개 띄우기" → 한 장이 **여섯으로 갈라진다**. 동시에 갈라지지 않고 물결처럼 어긋나며, 갈라지는 동안 타일 위를 빛이 한 번 훑고 지나간다
6. 각 타일에서 2층 로그가 흐르고, 3층 숫자가 우하단에서 올라간다
7. "하나 닫기" → 타일 하나가 사라지고 나머지가 부드럽게 재배치된다
8. 여섯 번 눌러 전부 닫으면 다시 Solo 한 장으로 돌아온다

3번이나 4번이 실패하면 Task 3 의 `tint.ts` 로 돌아간다. 5번이 동시에 갈라지면 `staggerDelay` 가 `transition-delay` 로 실제 전달되는지 본다.

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "feat: 워크스페이스 화면 조립 — 배경·유리·덱·컨트롤"
```

---

### Task 12: 성능 판정과 렌더 대응

스펙 §6.5 의 60fps 기준을 실제로 측정하고, 못 지키면 효과가 아니라 렌더 방식을 바꾼다.

**Files:**
- Modify: `src/widgets/tile-deck/ui/AgentTile.tsx` (필요할 때만)
- Modify: `src/entities/glass/ui/GlassPane.tsx` (필요할 때만)
- Create: `docs/superpowers/notes/2026-08-12-perf.md`

**Interfaces:**
- Consumes: Task 10·11 의 결과물
- Produces: 측정 기록 문서. 코드 변경은 측정 결과에 달렸다

- [ ] **Step 1: 측정 준비**

Run: `npm run dev`

DevTools 를 연다 (`Cmd+Option+I`). Performance 탭 → 녹화 시작.

- [ ] **Step 2: 분할 애니메이션 측정**

녹화 중에 "6개 띄우기" 를 누르고 2초 뒤 녹화를 멈춘다.

기록할 것:
- 분할 500ms 구간의 평균 FPS
- 롱 프레임(16.7ms 초과) 개수
- `backdrop-filter` 가 Rasterize 시간의 몇 %를 차지하는지

- [ ] **Step 3: 판정**

평균 60fps 이고 롱 프레임이 3개 이하면 **Step 6 으로 건너뛴다.**

못 미치면 Step 4 → Step 5 순서로 대응한다. **애니메이션 지속시간을 줄이거나 스태거를 없애는 대응은 하지 않는다** — 그건 제품을 없애는 것이다 (스펙 §6.5).

- [ ] **Step 4: 1차 대응 — 3층 갱신 주기 낮추기**

전환 중 2층 정지는 Task 10 에서 이미 적용돼 있다. 다음으로 싼 것은 3층이다.

`use-fleet.ts` 의 `CLOCK_MS` 가 1000ms 인데도 `nowMs` 변경이 전 타일을 재렌더시킨다. `src/widgets/tile-deck/ui/layers/Telemetry.tsx` 에서 함수 이름을 `TelemetryView` 로 바꾸고(내보내지 않는다), 아래를 그 아래에 둔다.

```tsx
export const Telemetry = memo(TelemetryView, (prev, next) =>
  prev.session === next.session && Math.floor(prev.nowMs / 1000) === Math.floor(next.nowMs / 1000),
)
```

Step 2 를 다시 돌려 측정한다. 통과하면 Step 6 으로 간다.

- [ ] **Step 5: 2차 대응 — 블러 캐시**

`GlassPane` 의 실시간 `backdrop-filter` 를 타일마다 중첩하는 것이 원인이면, 배경을 한 번만 블러 처리해 캐시하고 타일이 그 캐시본을 잘라 쓰도록 바꾼다.

구체적으로: `BackdropLayer` 옆에 블러 처리된 배경 사본을 한 장 더 깔고(`filter: blur(24px)`, `position: fixed; inset: 0`), 타일은 `backdrop-filter` 대신 그 사본을 자기 사각형만큼 잘라 배경 이미지로 쓴다(`background-position: -{rect.x}px -{rect.y}px`).

블러 인스턴스가 타일 수만큼에서 1개로 준다.

Step 2 를 다시 돌려 측정한다.

- [ ] **Step 6: 측정 기록 작성**

`docs/superpowers/notes/2026-08-12-perf.md` 에 아래 형태로 남긴다. 숫자는 실제 측정값으로 채운다.

```markdown
# 유리 타일 셸 성능 측정

- 측정일: 2026-08-12
- 환경: <OS·칩·해상도>
- 조건: 타일 6개, 2층 스트리밍 구동, 분할 애니메이션 500ms

## 결과

- 평균 FPS: <값>
- 롱 프레임(16.7ms 초과): <값>개
- backdrop-filter 가 차지한 Rasterize 비율: <값>%

## 적용한 대응

- <없음 / 3층 memo / 블러 캐시>

## 남은 것

- <없으면 "없음">
```

- [ ] **Step 7: 전체 검증**

Run: `npm run typecheck && npm test && npm run build`
Expected: 셋 다 통과

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "chore: 60fps 판정 측정과 렌더 대응 기록"
```

---

## 설계 대조 체크리스트

마지막 태스크가 끝나면 설계 카드와 코드를 대조한다.

- [ ] **역할·배선** — 카드에 적은 역할이 전부 있고, 위 레이어를 import 하는 곳이 없다
- [ ] **배선 계약** — `preload` 가 노출하는 것이 `pickBackdropPath` 하나뿐이다. `ipcRenderer` 가 렌더러에 없다
- [ ] **도메인 순수성** — `src/entities/*/model` 과 `src/shared/lib` 에 `react` import 가 없다

  Run: `grep -rn "from 'react'" src/entities/*/model src/shared/lib` → 결과 없음이어야 한다
- [ ] **공개 API** — 슬라이스 내부 경로를 바깥이 짚지 않는다

  Run: `grep -rn "@/entities/[a-z-]*/\|@/widgets/[a-z-]*/" src --include=*.tsx --include=*.ts | grep -v "^src/entities\|^src/widgets"` → 결과 없음이어야 한다
- [ ] **다음 변화 한 곳** — 실제로 확인한다. `src/entities/agent-session/api/runners/echo.ts` 에 러너를 하나 임시로 만들고 `runners.ts` 에 한 줄 등록해서, 다른 파일을 안 고치고도 뜨는지 본다. 확인 후 되돌린다
- [ ] **Steiger** — 레포에 없으므로 돌리지 않는다. 위 두 grep 이 그 자리를 대신한다
