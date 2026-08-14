import { MIN_CONTRAST, contrastRatio, relativeLuminance } from '@/shared/lib/contrast'
import type { LuminanceRange } from '@/shared/lib/luminance'

export type GlassTint = {
  /** 유리 표면 색. rgba() 문자열 */
  surface: string
  /** 표면과 같은 색의 불투명판 — 프라이머리 버튼처럼 글자색 바탕 위에 얹는 글자의 색 */
  surfaceSolid: string
  /** 본문 텍스트 색. rgba() 문자열 */
  text: string
  /** 텍스트 뒤에만 까는 검정 그라디언트 농도 (0–1) */
  scrimAlpha: number
  blurPx: number
  /**
   * 유리가 덮은 자리의 **배경만** 누르는 배율 (backdrop-filter 의 brightness).
   * 1 이면 건드리지 않는다. 사진 자체는 그대로다 — 유리 아래에서만 어두워진다.
   */
  backdropBrightness: number
  /**
   * 유리 뒤 층(3층)에 걸 소스 불투명도.
   * 표면이 삼키는 몫을 역산해 보정한 값이라 표면 알파에 따라 달라진다 (스펙 §5.3).
   */
  behindOpacity: number
}

/**
 * 블러 반경. 크게 흐릴수록 뒤가 형체가 아니라 빛과 색으로 남는다 — 그것이 유리다.
 * 24px 은 배경이 "조금 흐린 사진" 으로 읽혀 판과 다퉜다.
 *
 * 32 → 40: 유리를 얇게 내리면(알파 0.1대) 블러가 유리의 인상을 혼자 진다.
 * 44 는 알파가 두꺼울 때 죽처럼 뭉갰지만, 그만큼 옅은 층 뒤에서는 40 이 아직 빛으로 남는다
 */
export const GLASS_BLUR_PX = 40

/**
 * 유리 두께. 노브가 아니라 상수다 — 어둡기를 brightness 가 지므로 두께로 조절할 것이 없다.
 * 0.05 는 표면 알파 0.125 — 칠은 12.5% 뿐이고 사진은 그대로 비친다
 */
export const GLASS_THICKNESS = 0.05

/**
 * 채도 보정. 블러만 걸면 색이 회색으로 주저앉아 유리가 아니라 안개가 된다 —
 * 뒤의 색을 살려 되비추는 것이 유리의 인상을 만든다. 1.8 은 초록이 번져 얼룩이 됐다
 */
export const GLASS_SATURATE = 1.3

/**
 * 유리가 있다는 것 자체는 보여야 하는 하한.
 * 대비가 남아도 0 으로 두면 판이 사라져 타일 경계가 안 읽힌다.
 */
const ALPHA_FLOOR = 0.16

/**
 * 색이 고정된 유리(dark/light)의 하한. 자동보다 더 얇다.
 *
 * 어둡기는 알파가 아니라 backdrop-filter 의 brightness 가 진다 — 칠은 유리가 거기 있다는
 * 표시일 뿐이므로 0.1 이면 충분하고, 뒤의 사진은 90% 가 그대로 통과한다
 * (2026-08-13 사용자 요청: 투명도를 올리고 어둡게)
 */
const CHOSEN_ALPHA_FLOOR = 0.1

/**
 * 상한. 이 위로 가면 배경이 죽어 제품의 이유가 사라진다.
 *
 * 0.85 였다가 0.62 로 내렸다: 유리의 인상은 알파가 아니라 블러·채도·모서리 빛이 만든다.
 * 알파로 만들려 들면 우윳빛 판이 된다 (2026-08-13 사용자 보고)
 */
const ALPHA_CEIL = 0.62

/**
 * 어두운 유리가 배경을 누르는 배율.
 *
 * 어둡기를 알파로 만들면 배경이 사라지고, 여기서 만들면 배경은 그대로 있으면서 어두워진다 —
 * 유리 아래를 지나는 빛이 줄어드는 것이지 그 위에 페인트를 얹는 것이 아니다.
 * 0.45 는 가장 밝은 배경(휘도 1)조차 0.17 로 눌러, 얇은 유리(알파 0.1)에서도
 * 흰 글씨가 4.5:1 을 넘긴다 — 덮지 않고 보증을 되찾는 값이다.
 */
const DARK_BACKDROP_BRIGHTNESS = 0.45

/**
 * sRGB 채널에 배율 k 를 곱하면 상대 휘도는 대략 k^2.2 배가 된다.
 * CSS brightness 는 인코딩된 채널값을 곱하므로 여기서 휘도 쪽으로 옮겨 계산한다.
 */
const SRGB_GAMMA = 2.2

/** 최소 알파를 찾는 간격. 0.01 보다 잘게 봐도 눈으로 구분되지 않는다 */
const ALPHA_STEP = 0.01

/** 스크림을 올리는 단위 */
const SCRIM_STEP = 0.05

/**
 * 3층이 **화면에 도달해야 하는** 밝기 (스펙 §5.3의 25%).
 *
 * 소스 불투명도가 아니다. §5.3 은 "초점을 맞추면 읽히고 안 맞추면 질감" 이라는 지각 요구를
 * 적은 것이므로, 표면이 절반을 삼켜 12%만 도달하면 그 요구를 못 지킨 것이다.
 * 그래서 이 값을 목표로 두고 소스 쪽을 역산한다.
 */
const BEHIND_TARGET = 0.25

/** 거의 검정. 얇게 깔릴수록 어둡기는 알파가 아니라 이 색이 진다 */
const DARK_SURFACE = { r: 8, g: 10, b: 14 }
const LIGHT_SURFACE = { r: 246, g: 247, b: 250 }
const LIGHT_TEXT = { r: 255, g: 255, b: 255 }
const DARK_TEXT = { r: 11, g: 12, b: 14 }

type Polarity = {
  surface: { r: number; g: number; b: number }
  text: { r: number; g: number; b: number }
}

/**
 * 밝은 배경엔 밝은 유리 + 어두운 글씨, 어두운 배경엔 그 반대.
 * 배경을 거스르는 대신 따라간다 — 그래야 4.5:1 을 지키면서 유리가 가장 얇아진다.
 * 거스르는 조합(밝은 배경 + 어두운 유리)은 대비를 맞추려면 유리를 80% 넘게 칠해야 하고,
 * 그러면 배경이 사라져 이 제품의 존재 이유가 없어진다.
 */
const POLARITIES: Polarity[] = [
  { surface: LIGHT_SURFACE, text: DARK_TEXT },
  { surface: DARK_SURFACE, text: LIGHT_TEXT },
]

/**
 * 유리 두께를 정한다. 받는 것은 배경 밝기 하나가 아니라 **타일이 덮은 범위**다.
 *
 * 평균 하나로 정하면 보증이 어느 점에서도 성립하지 않는다. 하늘과 나무를 함께 덮은
 * 타일은 평균 0.5 → 밝은 유리 + 어두운 글씨를 고르고, 나무 위의 글씨가 죽는다.
 * 그러면서 밝기를 스칼라로 훑는 탐침은 전부 통과한다. 보증은 국소적이어야 한다.
 */
/**
 * 유리 색.
 *
 * 앱이 실제로 쓰는 것은 `dark` 하나다 — 화면에 고르는 자리는 없다.
 * 어두운 유리는 배경을 덮는 대신 눌러서(brightness) 어두워지므로, 얇은 채로
 * 어떤 사진 위에서도 4.5:1 을 지킨다. 고를 이유가 사라진 것이다.
 *
 * - `dark` — 배경을 눌러 어둡게. 보증 성립 (테스트가 모든 밝기 범위에서 검증한다)
 * - `auto` — 배경 극성을 따라가며 필요한 만큼 두꺼워진다. 보증 성립
 * - `light` — 밝은 유리로 고정하고 얇게 둔다. **보증 밖**이다:
 *   brightness 로는 검정을 밝힐 수 없어(휘도 0.02 × 1.6^2.2 ≈ 0.057) 알파로만 가능한데,
 *   그러면 유리가 아니라 흰 판이 된다. 지금 아무도 쓰지 않는다
 */
export type GlassTone = 'auto' | 'dark' | 'light'

export function computeTint(
  background: LuminanceRange,
  thickness: number,
  tone: GlassTone = 'auto',
): GlassTint {
  // 어두운 유리는 배경을 덮는 대신 누른다 — 유리에 닿는 밝기가 이미 눌린 값이므로
  // 뒤의 계산은 전부 이 눌린 범위 위에서 이뤄져야 한다
  const backdropBrightness = tone === 'dark' ? DARK_BACKDROP_BRIGHTNESS : 1
  const pressed = backdropBrightness ** SRGB_GAMMA
  const range = {
    min: clamp01(Math.min(background.min, background.max)) * pressed,
    max: clamp01(Math.max(background.min, background.max)) * pressed,
  }
  const t = clamp01(thickness)

  // 두 극성 중 더 얇은 유리로 4.5:1 을 만족하는 쪽을 쓴다 (auto).
  // 사람이 색을 골랐으면 그 극성만 후보다 — 대신 필요한 만큼 두꺼워진다
  const candidates =
    tone === 'auto'
      ? POLARITIES
      : POLARITIES.filter((polarity) =>
          tone === 'dark'
            ? relativeLuminance(polarity.surface) < 0.5
            : relativeLuminance(polarity.surface) >= 0.5,
        )
  // 각 극성은 자기에게 가장 불리한 밝기에서 평가된다
  const chosen = candidates.map((polarity) => {
    const surfaceLuminance = relativeLuminance(polarity.surface)
    const textLuminance = relativeLuminance(polarity.text)
    const riskBg = riskLuminance(range, textLuminance, surfaceLuminance)
    return {
      polarity,
      surfaceLuminance,
      textLuminance,
      riskBg,
      minAlpha: minAlphaFor(riskBg, surfaceLuminance, textLuminance),
    }
  }).reduce((best, candidate) => (candidate.minAlpha < best.minAlpha ? candidate : best))

  // 색이 고정된 유리는 보증이 요구하는 두께를 강제하지 않는다 — 어둡기를 brightness 가 졌다
  const floor = tone === 'auto' ? Math.max(ALPHA_FLOOR, chosen.minAlpha) : CHOSEN_ALPHA_FLOOR
  // 두께는 "필요 최소치에서 얼마나 더 두껍게" 를 정한다 (지금은 GLASS_THICKNESS 상수).
  // 유리는 **한 겹으로 균일**해야 한다 — 자리마다 농도가 다르면 얼룩으로 보인다
  const alpha = Number((floor + (ALPHA_CEIL - floor) * t).toFixed(3))
  const afterGlass = composite(chosen.riskBg, chosen.surfaceLuminance, alpha)

  return {
    surface: rgba(chosen.polarity.surface, alpha),
    // 같은 색의 불투명판 — currentColor 바탕 위에 얹는 글자(프라이머리 버튼)의 색이다.
    // 극성이 보증한 쌍(텍스트 ↔ 표면)을 뒤집어 쓰므로 대비는 같은 계산으로 성립한다
    surfaceSolid: rgba(chosen.polarity.surface, 1),
    text: rgba(chosen.polarity.text, 1),
    // 스크림은 보증의 마지막 그물이다. 색이 고정된 판에서는 걷는다 —
    // 위에서 아래로 깔리는 검정 그라디언트는 "뒤가 보이는 얇은 유리" 를 정면으로 배신한다
    scrimAlpha: tone === 'auto' ? findScrim(afterGlass, chosen.textLuminance) : 0,
    blurPx: GLASS_BLUR_PX,
    backdropBrightness,
    behindOpacity: behindOpacityFor(alpha),
  }
}

/**
 * 표면이 삼키는 만큼 3층 소스를 올린다.
 *
 * 유리 뒤 내용이 화면에 남기는 몫은 `source × (1 - surfaceAlpha)` 이므로 그것을 역산한다.
 * 상수 하나로 지금 화면에 맞춰 두면 사용자가 두께를 밀거나 배경을 바꾸는 순간 다시 어긋난다 —
 * 표면 알파는 타일마다, 프레임마다 다르다.
 *
 * 보정이 1 에 닿으면(유리가 두꺼우면) 3층은 자연스럽게 옅어진다. 그건 정직한 동작이다:
 * 두꺼운 유리를 고른 사용자는 배경을 덜 보겠다고 고른 것이고, 3층은 배경 쪽 시민이다.
 * 도달 밝기가 목표를 **넘는 일은 없으므로** 2층(60%)과의 서열도 뒤집히지 않는다.
 */
function behindOpacityFor(surfaceAlpha: number): number {
  const survives = 1 - surfaceAlpha
  if (survives <= 0) return 1
  // 세 자리에서 **내림**한다. 반올림하면 도달 밝기가 목표를 아주 조금 넘을 수 있고,
  // 그러면 "목표를 넘지 않는다" 가 관용오차로만 성립하는 성질이 된다
  return Math.min(1, Math.floor((BEHIND_TARGET / survives) * 1000) / 1000)
}

/**
 * 이 극성에서 대비가 가장 위태로운 배경 밝기.
 * 어두운 글씨는 어두운 배경에서 죽고, 밝은 글씨는 밝은 배경에서 죽는다 —
 * 글씨가 가까이 있는 쪽 끝이 위험한 쪽이다.
 *
 * 여기서 얻은 알파는 범위 안의 다른 밝기에서도 안전하다. 알파를 고정하면 합성 휘도는
 * 배경 밝기에 단조 증가하고, 위험한 끝에서 글씨와의 거리가 가장 좁기 때문이다.
 */
function riskLuminance(range: LuminanceRange, textLuminance: number, surfaceLuminance: number) {
  return textLuminance < surfaceLuminance ? range.min : range.max
}

function composite(bg: number, surfaceLuminance: number, alpha: number): number {
  return bg * (1 - alpha) + surfaceLuminance * alpha
}

/** 이 극성으로 4.5:1 을 만족하는 가장 얇은 알파. 상한까지 못 맞추면 상한을 돌려준다 */
function minAlphaFor(bg: number, surfaceLuminance: number, textLuminance: number): number {
  for (let alpha = 0; alpha <= ALPHA_CEIL; alpha += ALPHA_STEP) {
    if (contrastRatio(textLuminance, composite(bg, surfaceLuminance, alpha)) >= MIN_CONTRAST) {
      return Number(alpha.toFixed(2))
    }
  }
  return ALPHA_CEIL
}

/**
 * 유리만으로 4.5:1 이 안 나오면 텍스트 뒤 검정 스크림을 올려서 맞춘다.
 * 스크림은 검정이므로 합성 휘도가 단조 감소한다 — 밝은 글씨일 때만 대비가 오른다.
 * 어두운 글씨인데 대비가 모자라면 스크림은 오히려 해가 되므로 0 을 준다.
 *
 * **현재 이 함수는 0 만 돌려준다.** 밝기 범위 쌍 × 두께를 832,341 조합 훑어도 유리만으로
 * 4.5:1 이 나오기 때문이다(최악 4.505 @ min=0, max=0.225, t=0). 그래도 남겨 둔다 — 팔레트가
 * 바뀌면 보증을 지탱할 마지막 그물이 이것이다.
 *
 * 살아나기 전에 반드시 고칠 것: 이 계산은 스크림을 **균일한 검정 베일**로 모델링하고
 * tint.test.ts 도 같은 가정으로 검증하는데, GlassPane 이 실제로 칠하는 것은
 * **위에서 아래로 옅어지는 그라디언트**다. 즉 화면 아래쪽 텍스트는 테스트가 통과시킨 대비를
 * 받지 못한다. 스크림이 실제로 쓰이는 날, 이 불일치를 먼저 해소해야 한다
 * (그라디언트의 최소 농도로 계산하거나, 칠하는 쪽을 균일하게 바꾸거나).
 */
function findScrim(afterGlass: number, textLuminance: number): number {
  if (contrastRatio(textLuminance, afterGlass) >= MIN_CONTRAST) return 0
  if (textLuminance < afterGlass) return 0

  for (let scrim = SCRIM_STEP; scrim <= 1; scrim += SCRIM_STEP) {
    if (contrastRatio(textLuminance, afterGlass * (1 - scrim)) >= MIN_CONTRAST) {
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
