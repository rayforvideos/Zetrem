export type Rgb = { r: number; g: number; b: number }

/** WCAG 2.1 본문 텍스트 최소 대비. 스펙 §4.2 의 하드 제약 */
export const MIN_CONTRAST = 4.5

function linearize(channel8bit: number): number {
  const c = channel8bit / 255
  // sRGB 감마 역변환. 임계값 0.03928 과 지수 2.4, 상수 1.055/12.92 는 WCAG 2.1 정의값
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance({ r, g, b }: Rgb): number {
  // 계수는 sRGB 휘도 가중치(ITU-R BT.709). 사람 눈이 녹색에 가장 민감하다
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

export function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  // 0.05 는 WCAG 정의의 흑색 보정항 — 완전한 검정(휘도 0)끼리도 0으로 나누지 않게 한다
  return (lighter + 0.05) / (darker + 0.05)
}
