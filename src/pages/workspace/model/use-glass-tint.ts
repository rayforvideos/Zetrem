import { useCallback, useSyncExternalStore } from 'react'
import { FALLBACK_BACKDROP, backdropStore } from '@/entities/backdrop'
import { GLASS_THICKNESS, computeTint } from '@/entities/glass'
import type { GlassTint } from '@/entities/glass'
import { relativeLuminance } from '@/shared/lib/contrast'
import { luminanceRangeOfRect } from '@/shared/lib/luminance'
import type { LuminanceRange, UnitRect } from '@/shared/lib/luminance'

type GlassTintSource = {
  /**
   * 그 자리의 배경 밝기로 틴트를 낸다 — 창을 옮기면 틴트가 따라온다 (스펙 §4.1).
   * 두께를 따로 주면 그 판만 진하게 할 수 있다 (터미널처럼 화면 전체가 글자인 판)
   */
  tintFor(unit: UnitRect, thicknessOverride?: number): GlassTint
}

/** 배경이 없을 때는 우리가 칠한 폴백 판의 양 끝 색에서 범위를 얻는다 */
const FALLBACK_RANGE: LuminanceRange = range(FALLBACK_BACKDROP.ends.map(relativeLuminance))

/**
 * 배경 슬라이스와 유리 슬라이스를 읽어 합친다.
 * 두 entities 를 함께 읽으므로 이 소비는 위 레이어(pages)의 것이다.
 */
export function useGlassTint(): GlassTintSource {
  const state = useSyncExternalStore(backdropStore.subscribe, backdropStore.get, backdropStore.get)
  const { backdrop } = state

  const tintFor = useCallback(
    (unit: UnitRect, thicknessOverride?: number): GlassTint => {
      // 평균이 아니라 범위를 넘긴다 — 보증은 타일 안에서 가장 불리한 셀에 걸린다 (스펙 §4.1)
      const luminance = backdrop
        ? luminanceRangeOfRect(backdrop.profile, unit)
        : FALLBACK_RANGE
      // 유리는 늘 어둡고 얇다 — 고를 것이 없으므로 여기서 상수로 고정한다
      return computeTint(luminance, thicknessOverride ?? GLASS_THICKNESS, 'dark')
    },
    [backdrop],
  )

  return { tintFor }
}

function range(values: number[]): LuminanceRange {
  return { min: Math.min(...values), max: Math.max(...values) }
}
