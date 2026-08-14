import { LAYOUT } from '@/shared/config/motion'

export type Rect = { x: number; y: number; w: number; h: number }
export type Viewport = { w: number; h: number }

export function layoutTiles(count: number, viewport: Viewport): Rect[] {
  if (count <= 0) return []

  const { outerMarginPx: margin, gapPx: gap } = LAYOUT
  const areaW = viewport.w - margin * 2
  const areaH = viewport.h - margin * 2
  const maxCols = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / maxCols)
  const rowH = (areaH - gap * (rows - 1)) / rows

  const rects: Rect[] = []
  let placed = 0
  for (let row = 0; row < rows; row += 1) {
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

export function soloRect(viewport: Viewport): Rect {
  const inset = LAYOUT.soloInsetRatio
  return {
    x: viewport.w * inset,
    y: viewport.h * inset,
    w: viewport.w * (1 - inset * 2),
    h: viewport.h * (1 - inset * 2),
  }
}

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

  const terminalW = Math.round(areaW * TERMINAL_SHARE)
  const sideX = margin + terminalW + gap
  const sideW = areaW - terminalW - gap
  const terminal = { x: margin, y: margin, w: terminalW, h: areaH }

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

const TERMINAL_SHARE = 0.52

const SIDE_ROWS_MAX = 3
