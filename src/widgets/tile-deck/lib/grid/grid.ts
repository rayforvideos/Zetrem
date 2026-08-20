import type { Rect, Viewport } from './grid.types'

import { LAYOUT } from '@/shared/config/motion/motion'

export function soloRect(viewport: Viewport): Rect {
  const inset = LAYOUT.soloInsetRatio
  return {
    x: viewport.w * inset,
    y: viewport.h * inset,
    w: viewport.w * (1 - inset * 2),
    h: viewport.h * (1 - inset * 2),
  }
}

function split(viewport: Viewport, sidebarW: number): { terminal: Rect; side: Rect } {
  const { outerMarginPx: margin, topMarginPx: top, gapPx: gap } = LAYOUT
  const areaW = viewport.w - margin * 2
  const areaH = viewport.h - top - margin
  const roomForTiles = areaW - sidebarW - gap
  const terminalW = Math.min(
    areaW - gap - MIN_TILE_W,
    Math.max(sidebarW + MIN_TALK_W, sidebarW + Math.round(roomForTiles * CONVERSATION_SHARE)),
  )
  return {
    terminal: { x: margin, y: top, w: terminalW, h: areaH },
    side: { x: margin + terminalW + gap, y: top, w: areaW - terminalW - gap, h: areaH },
  }
}

export function crowded(sessionCount: number, boardH = Number.POSITIVE_INFINITY): boolean {
  return sessionCount >= LANES_FROM || boardH < CARDS_NEED_H
}

export function boarded(sessionCount: number): boolean {
  return sessionCount >= BOARD_FROM
}

export function boardLayout(viewport: Viewport, sidebarW = 0): { terminal: Rect; board: Rect } {
  const { terminal, side } = split(viewport, sidebarW)
  return { terminal, board: side }
}

export function observatoryLayout(
  sessionCount: number,
  viewport: Viewport,
  sidebarW = 0,
): { terminal: Rect; sessions: Rect[] } {
  const { outerMarginPx: margin, topMarginPx: top, gapPx: gap } = LAYOUT
  const areaW = viewport.w - margin * 2
  const areaH = viewport.h - top - margin

  if (sessionCount <= 0) {
    return { terminal: { x: margin, y: top, w: areaW, h: areaH }, sessions: [] }
  }

  const { terminal, side } = split(viewport, sidebarW)
  const sideX = side.x
  const sideW = side.w

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
      y: top + row * (rowH + gap),
      w: colW,
      h: rowH,
    })
  }
  return { terminal, sessions }
}

const CONVERSATION_SHARE = 0.42

const MIN_TILE_W = 360

const MIN_TALK_W = 340

const SIDE_ROWS_MAX = 3

export const LANES_FROM = 10

export const BOARD_FROM = 3

const CARDS_NEED_H = 420

export function roomToFan(viewport: Viewport, sidebarW: number): boolean {
  const areaW = viewport.w - LAYOUT.outerMarginPx * 2
  return areaW - sidebarW - LAYOUT.gapPx - MIN_TALK_W >= MIN_TILE_W
}

export const CREW_BAR_H = 34

const NARROW_MARGIN = 16

const SHEET_SHARE = 0.5

export function narrowLayout(
  viewport: Viewport,
  sheetOpen = false,
): { bar: Rect; body: Rect; sheet: Rect } {
  const { topMarginPx: top, gapPx: gap } = LAYOUT
  const left = NARROW_MARGIN
  const areaW = Math.max(0, viewport.w - left - NARROW_MARGIN)
  const areaH = Math.max(0, viewport.h - top - NARROW_MARGIN)
  const shut = Math.max(0, areaH - CREW_BAR_H - gap)
  const sheetH = sheetOpen ? Math.round(Math.max(0, shut - gap) * SHEET_SHARE) : 0
  const bodyH = Math.max(0, shut - (sheetOpen ? sheetH + gap : 0))
  const barY = top + areaH - CREW_BAR_H

  return {
    body: { x: left, y: top, w: areaW, h: bodyH },
    bar: { x: left, y: barY, w: areaW, h: CREW_BAR_H },
    sheet: { x: left, y: top + bodyH + gap, w: areaW, h: sheetH },
  }
}
