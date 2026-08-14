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

/**
 * 관측기의 배치 — 터미널이 일터이고 세션은 그 곁의 판이다.
 *
 * 세션을 터미널과 같은 크기로 늘어놓으면 두 줄짜리 내용이 화면을 나눠 갖는다 (실측: 텅 빈
 * 회색 판 세 개로 보였다). 일하는 자리는 하나이고 그것이 터미널이므로, 터미널이 기둥을
 * 잡고 세션은 곁에 쌓인다. 세션이 없으면 터미널이 화면을 갖는다.
 */
export function observatoryLayout(
  sessionCount: number,
  viewport: Viewport,
): { terminal: Rect; sessions: Rect[] } {
  const { outerMarginPx: margin, gapPx: gap } = LAYOUT
  const areaW = viewport.w - margin * 2
  const areaH = viewport.h - margin * 2

  if (sessionCount <= 0) {
    return { terminal: { x: margin, y: margin, w: areaW, h: areaH }, sessions: [] }
  }

  // 터미널이 넓다 — 사람이 글을 치는 자리이고, 곁의 판은 지켜보는 자리다
  const terminalW = Math.round(areaW * TERMINAL_SHARE)
  const sideX = margin + terminalW + gap
  const sideW = areaW - terminalW - gap
  const terminal = { x: margin, y: margin, w: terminalW, h: areaH }

  // 판이 우표만 해지기 전에 두 줄로 접는다
  const columns = sessionCount > SIDE_ROWS_MAX ? 2 : 1
  const rows = Math.ceil(sessionCount / columns)
  const colW = (sideW - gap * (columns - 1)) / columns
  const rowH = (areaH - gap * (rows - 1)) / rows

  const sessions: Rect[] = []
  for (let index = 0; index < sessionCount; index += 1) {
    const column = index % columns
    const row = Math.floor(index / columns)
    sessions.push({
      x: sideX + column * (colW + gap),
      y: margin + row * (rowH + gap),
      w: colW,
      h: rowH,
    })
  }
  return { terminal, sessions }
}

/** 터미널이 가로에서 차지하는 몫. 셸 80칸이 접히지 않는 폭이다 */
const TERMINAL_SHARE = 0.52

/** 한 줄에 쌓을 수 있는 판의 수. 이보다 많으면 두 줄로 접는다 */
const SIDE_ROWS_MAX = 3
