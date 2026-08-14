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

/**
 * 사각형 아래 셀들의 밝기 범위.
 * 대비 보증이 걸리는 곳은 평균이 아니라 이 양 끝이다 — 사람은 평균이 아니라 한 점을 읽는다.
 */
export type LuminanceRange = { min: number; max: number }

/**
 * 사각형이 덮은 셀들의 밝기 범위를 한 번의 순회로 낸다.
 *
 * 평균을 내지 않는다. 하늘과 나무를 함께 덮은 타일은 평균 0.5 가 나오고, 그 평균으로
 * 밝은 유리 + 어두운 글씨를 고르면 나무 위의 글씨는 읽을 수 없다. 평균은 어느 점에서도
 * 보증되지 않는 값이다.
 *
 * 단위는 셀이므로 이 범위는 **셀 단위 국소성**이다. 셀 하나는 자기 픽셀들의 평균이라,
 * 한 셀 안에서 밝기가 갈리는 경우까지 잡지는 못한다 (스펙 §4.1).
 */
export function luminanceRangeOfRect(profile: LuminanceProfile, rect: UnitRect): LuminanceRange {
  const { cols, rows, cells } = profile
  const colFrom = clampIndex(Math.floor(rect.x * cols), cols)
  const colTo = clampIndex(Math.ceil((rect.x + rect.w) * cols) - 1, cols)
  const rowFrom = clampIndex(Math.floor(rect.y * rows), rows)
  const rowTo = clampIndex(Math.ceil((rect.y + rect.h) * rows) - 1, rows)

  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (let row = rowFrom; row <= rowTo; row += 1) {
    for (let col = colFrom; col <= colTo; col += 1) {
      const cell = cells[row * cols + col] ?? 0
      if (cell < min) min = cell
      if (cell > max) max = cell
    }
  }
  // 사각형이 어떤 셀도 덮지 못하는 경우(폭 0 등). 검정으로 보는 것이 안전한 쪽이다
  return min > max ? { min: 0, max: 0 } : { min, max }
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
