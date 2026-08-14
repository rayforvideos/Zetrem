import { describe, expect, it } from 'vitest'
import { MIN_CONTRAST, contrastRatio, relativeLuminance } from '@/shared/lib/contrast'
import type { LuminanceRange } from '@/shared/lib/luminance'
import { GLASS_BLUR_PX, computeTint } from './tint'

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

/**
 * 이 범위 안의 **어느 지점에서든** 본문 대비가 4.5:1 이상인지 본다.
 * 평균 한 점이 아니라 양 끝과 가운데를 본다 — 사람은 평균이 아니라 한 점을 읽는다.
 */
function worstRatio(range: LuminanceRange, thickness: number): number {
  const tint = computeTint(range, thickness)
  const textL = relativeLuminance(parseRgba(tint.text))
  const probes = [range.min, (range.min + range.max) / 2, range.max]
  return Math.min(
    ...probes.map((bg) =>
      contrastRatio(textL, compositedLuminance(bg, tint.surface, tint.scrimAlpha)),
    ),
  )
}

const SAMPLES = [0, 0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95, 1]
const THICKNESSES = [0, 0.25, 0.5, 0.75, 1]

/** min ≤ max 인 모든 쌍. 균일한 배경(min = max)도 이 안에 들어 있다 */
function pairs(): LuminanceRange[] {
  const out: LuminanceRange[] = []
  for (const min of SAMPLES) for (const max of SAMPLES) if (min <= max) out.push({ min, max })
  return out
}

function flat(luminance: number): LuminanceRange {
  return { min: luminance, max: luminance }
}

describe('computeTint', () => {
  it('어떤 배경 범위·두께 조합에서도 범위 전체에서 본문 대비 4.5 이상을 확보한다', () => {
    for (const range of pairs()) {
      for (const thickness of THICKNESSES) {
        const ratio = worstRatio(range, thickness)
        expect(
          ratio,
          `min=${range.min} max=${range.max} thickness=${thickness} ratio=${ratio.toFixed(2)}`,
        ).toBeGreaterThanOrEqual(MIN_CONTRAST)
      }
    }
  })

  it('밝기가 갈린 타일은 평균이 아니라 최악 셀로 판단한다', () => {
    // 하늘(0.9)과 나무(0.02)를 함께 덮은 타일. 평균은 0.46 이라 "중간 밝기" 로 보인다
    const straddling = computeTint({ min: 0.02, max: 0.9 }, 0)
    const asMean = computeTint(flat(0.46), 0)
    // 같은 극성을 고르더라도 유리는 더 두꺼워야 한다 — 분산이 클 때가 유리가 일할 때다
    expect(parseRgba(straddling.surface).a).toBeGreaterThan(parseRgba(asMean.surface).a)
    // 그리고 그 두께로 어두운 끝에서도 보증이 선다
    expect(worstRatio({ min: 0.02, max: 0.9 }, 0)).toBeGreaterThanOrEqual(MIN_CONTRAST)
  })

  it('평균으로 판단하면 깨지는 조합을 이 계산은 막는다', () => {
    // 평균(0.46)으로 고른 틴트를 어두운 끝(0.02)에 놓아 보면 보증이 깨진다.
    // 이 단정이 실패하는 날은 평균이 안전해진 날이므로, 그때는 이 테스트를 지워도 된다
    const asMean = computeTint(flat(0.46), 0)
    const textL = relativeLuminance(parseRgba(asMean.text))
    const atDarkEnd = contrastRatio(textL, compositedLuminance(0.02, asMean.surface, asMean.scrimAlpha))
    expect(atDarkEnd).toBeLessThan(MIN_CONTRAST)
  })

  it('균일한 배경에서는 범위가 한 점이므로 아무것도 달라지지 않는다', () => {
    for (const bg of SAMPLES) {
      expect(computeTint(flat(bg), 0.5)).toEqual(computeTint({ min: bg, max: bg }, 0.5))
    }
  })

  it('범위가 넓어지면 유리가 얇아지지는 않는다', () => {
    for (const thickness of THICKNESSES) {
      const narrow = parseRgba(computeTint({ min: 0.4, max: 0.6 }, thickness).surface).a
      const wide = parseRgba(computeTint({ min: 0.05, max: 0.95 }, thickness).surface).a
      expect(wide, `thickness=${thickness}`).toBeGreaterThanOrEqual(narrow)
    }
  })

  it('밝은 배경에는 밝은 유리와 어두운 글씨를 준다 — 배경을 따라간다', () => {
    const tint = computeTint(flat(0.9), 0.5)
    expect(relativeLuminance(parseRgba(tint.surface))).toBeGreaterThan(0.5)
    expect(relativeLuminance(parseRgba(tint.text))).toBeLessThan(0.5)
  })

  it('어두운 배경에는 어두운 유리와 밝은 글씨를 준다 — 배경을 따라간다', () => {
    const tint = computeTint(flat(0.05), 0.5)
    expect(relativeLuminance(parseRgba(tint.surface))).toBeLessThan(0.5)
    expect(relativeLuminance(parseRgba(tint.text))).toBeGreaterThan(0.5)
  })

  it('두께 0 이고 배경이 고르면 유리가 얇다 — 대비가 허용하는 만큼 배경이 비쳐야 한다', () => {
    // 배경을 따라가는 극성에서는 대비가 크게 남으므로 가시성 하한 근처까지 얇아진다
    for (const bg of [0, 0.05, 0.2, 0.8, 0.95, 1]) {
      const { a } = parseRgba(computeTint(flat(bg), 0).surface)
      expect(a, `bg=${bg} alpha=${a}`).toBeLessThanOrEqual(0.25)
    }
  })

  it('두께를 올리면 유리 불투명도가 올라간다', () => {
    const thin = parseRgba(computeTint(flat(0.5), 0).surface)
    const thick = parseRgba(computeTint(flat(0.5), 1).surface)
    expect(thick.a).toBeGreaterThan(thin.a)
  })

  it('스크림은 0 이상 1 이하이고, 필요 없으면 0 이다', () => {
    for (const range of pairs()) {
      const { scrimAlpha } = computeTint(range, 1)
      expect(scrimAlpha).toBeGreaterThanOrEqual(0)
      expect(scrimAlpha).toBeLessThanOrEqual(1)
    }
    // 두께 최대 + 대비가 이미 충분한 조합에서는 스크림이 필요 없다
    expect(computeTint(flat(0.5), 1).scrimAlpha).toBe(0)
  })

  it('범위 밖 입력과 뒤집힌 범위를 클램프한다', () => {
    expect(() => computeTint({ min: -1, max: 5 }, 5)).not.toThrow()
    expect(parseRgba(computeTint({ min: -1, max: 5 }, 5).surface).a).toBeLessThanOrEqual(1)
    // min 과 max 가 뒤바뀌어 와도 같은 결과여야 한다
    expect(computeTint({ min: 0.9, max: 0.1 }, 0.5)).toEqual(computeTint({ min: 0.1, max: 0.9 }, 0.5))
  })

  it('3층 도달 밝기가 표면 두께와 무관하게 목표에 붙는다 (스펙 §5.3)', () => {
    // 도달 밝기 = 소스 불투명도 × (1 - 표면 알파). 보정이 한계에 닿기 전까지는 목표 그대로다
    for (const bg of SAMPLES) {
      for (const thickness of [0, 0.25, 0.5]) {
        const tint = computeTint(flat(bg), thickness)
        const surfaceAlpha = parseRgba(tint.surface).a
        const delivered = tint.behindOpacity * (1 - surfaceAlpha)
        expect(delivered, `bg=${bg} t=${thickness} delivered=${delivered.toFixed(3)}`).toBeCloseTo(
          0.25,
          2,
        )
      }
    }
  })

  it('도달 밝기가 목표를 넘지 않는다 — 넘으면 2층과 서열이 뒤집힌다', () => {
    for (const range of pairs()) {
      for (const thickness of THICKNESSES) {
        const tint = computeTint(range, thickness)
        const delivered = tint.behindOpacity * (1 - parseRgba(tint.surface).a)
        expect(delivered).toBeLessThanOrEqual(0.25 + 1e-9)
        expect(tint.behindOpacity).toBeGreaterThan(0)
        expect(tint.behindOpacity).toBeLessThanOrEqual(1)
      }
    }
  })

  it('표면이 두꺼울수록 3층 소스를 더 올린다 — 도달 밝기를 목표에 맞추려는 보정이다', () => {
    const thin = computeTint(flat(0.5), 0).behindOpacity
    const thick = computeTint(flat(0.5), 1).behindOpacity
    expect(thick).toBeGreaterThan(thin)
    // 도달 밝기는 목표를 넘지 않는다 — 2층(70%)과의 서열이 뒤집히면 안 된다
    for (const t of THICKNESSES) {
      const tint = computeTint(flat(0.5), t)
      const reaches = tint.behindOpacity * (1 - parseRgba(tint.surface).a)
      expect(reaches).toBeLessThanOrEqual(0.25 + 1e-9)
    }
  })

  it('얇은 유리에서는 소스를 덜 올린다 — 삼켜지는 몫이 적다', () => {
    const thin = computeTint(flat(0.5), 0)
    const thicker = computeTint(flat(0.5), 0.5)
    expect(thin.behindOpacity).toBeLessThan(thicker.behindOpacity)
  })

  it('블러 반경은 유리가 뒤를 형체가 아니라 빛으로 만드는 크기다', () => {
    expect(computeTint(flat(0.5), 0.5).blurPx).toBe(GLASS_BLUR_PX)
  })
})

describe('surfaceSolid', () => {
  it('표면과 같은 색의 불투명판이다 — 프라이머리 버튼의 글자색 재료', () => {
    const tint = computeTint({ min: 0.8, max: 0.8 }, 0.5)
    const surface = parseRgba(tint.surface)
    const solid = parseRgba(tint.surfaceSolid)
    expect(solid.r).toBe(surface.r)
    expect(solid.g).toBe(surface.g)
    expect(solid.b).toBe(surface.b)
    expect(solid.a).toBe(1)
  })
})

describe('computeTint — 유리 색을 사람이 고를 때', () => {
  it('어둡게 를 고르면 배경이 밝아도 어두운 유리에 밝은 글씨다', () => {
    const tint = computeTint(flat(0.9), 0, 'dark')
    expect(relativeLuminance(parseRgba(tint.surface))).toBeLessThan(0.2)
    expect(relativeLuminance(parseRgba(tint.text))).toBeGreaterThan(0.5)
  })

  it('밝게 를 고르면 배경이 어두워도 밝은 유리에 어두운 글씨다', () => {
    const tint = computeTint(flat(0.05), 0, 'light')
    expect(relativeLuminance(parseRgba(tint.surface))).toBeGreaterThan(0.8)
    expect(relativeLuminance(parseRgba(tint.text))).toBeLessThan(0.2)
  })

  it('사람이 색을 고르면 유리는 얇게 머문다 — 뒤가 보이는 것이 고른 이유다', () => {
    const chosen = computeTint(flat(0.9), 0, 'dark')
    expect(parseRgba(chosen.surface).a).toBeLessThanOrEqual(0.12)

    // 두께를 끝까지 올리면 사람이 스스로 더 진한 자리로 갈 수 있다
    const thick = computeTint(flat(0.9), 1, 'dark')
    expect(parseRgba(thick.surface).a).toBeGreaterThan(0.5)
  })

  it('어둡기는 덮어서가 아니라 뒤를 눌러서 만든다 — 배경은 그대로 보인다', () => {
    // 알파로 어둡게 하면 배경이 사라진다. backdrop-filter 의 brightness 는 **유리가 덮은
    // 자리의 배경만** 어둡게 하므로, 사진은 그대로 있고 판 아래에서만 눌린다
    expect(computeTint(flat(0.9), 0, 'dark').backdropBrightness).toBeLessThan(1)
    // 자동과 밝게 는 배경을 건드리지 않는다
    expect(computeTint(flat(0.9), 0).backdropBrightness).toBe(1)
    expect(computeTint(flat(0.05), 0, 'light').backdropBrightness).toBe(1)
  })

  it('어두운 유리도 4.5:1 을 지킨다 — 뒤를 눌렀으므로 덮지 않고도 읽힌다', () => {
    for (const range of pairs()) {
      for (const thickness of THICKNESSES) {
        const tint = computeTint(range, thickness, 'dark')
        const textL = relativeLuminance(parseRgba(tint.text))
        // 배경은 유리에 닿기 전에 brightness 를 통과한다 — sRGB 채널 배율은 휘도에서 k^2.2
        const pressed = (bg: number) => bg * tint.backdropBrightness ** 2.2
        const worst = Math.min(
          ...[range.min, (range.min + range.max) / 2, range.max].map((bg) =>
            contrastRatio(textL, compositedLuminance(pressed(bg), tint.surface, tint.scrimAlpha)),
          ),
        )
        expect(worst, `min=${range.min} max=${range.max} t=${thickness}`).toBeGreaterThanOrEqual(
          MIN_CONTRAST,
        )
      }
    }
  })

  it('고른 색은 거의 검정이다 — 얇게 깔아도 어둡게 읽히려면 색이 진해야 한다', () => {
    // 알파를 낮춰 배경을 살리면 어둡기는 색이 혼자 져야 한다.
    // 유리 표면 휘도가 0.01 을 넘으면 알파 0.1 에서 회색 베일로 읽힌다
    const dark = parseRgba(computeTint(flat(0.5), 0, 'dark').surface)
    expect(relativeLuminance(dark)).toBeLessThan(0.01)
  })

  it('얇을수록 블러가 유리를 만든다 — 뒤가 형체로 남으면 창이지 유리가 아니다', () => {
    expect(GLASS_BLUR_PX).toBeGreaterThanOrEqual(40)
  })

  it('자동에서는 4.5:1 이 그대로다 — 기본값은 언제나 읽힌다', () => {
    for (const range of pairs()) {
      for (const thickness of THICKNESSES) {
        for (const tone of ['auto'] as const) {
          const tint = computeTint(range, thickness, tone)
          const textL = relativeLuminance(parseRgba(tint.text))
          const worst = Math.min(
            ...[range.min, (range.min + range.max) / 2, range.max].map((bg) =>
              contrastRatio(textL, compositedLuminance(bg, tint.surface, tint.scrimAlpha)),
            ),
          )
          expect(worst, `${tone} min=${range.min} max=${range.max} t=${thickness}`).toBeGreaterThanOrEqual(
            MIN_CONTRAST,
          )
        }
      }
    }
  })

  it('자동은 지금까지와 같다 — 더 얇은 쪽을 고른다', () => {
    expect(computeTint(flat(0.9), 0.3)).toEqual(computeTint(flat(0.9), 0.3, 'auto'))
  })
})
