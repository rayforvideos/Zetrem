import type { LuminanceProfile } from '@/shared/lib/luminance'

export type Backdrop = {
  /** 렌더러가 그릴 수 있는 URL. 파일에서 온 배경은 blob: 이다 */
  url: string
  profile: LuminanceProfile
}

/**
 * 배경을 아직 안 고른 상태에서도 유리가 유리로 보여야 한다.
 * 우리가 칠하는 판이라 양 끝 색을 안다 — 대비 보증도 이 두 색에서 계산된다.
 */
export const FALLBACK_BACKDROP = {
  gradient: 'linear-gradient(140deg, #23303f 0%, #16202b 100%)',
  ends: [
    { r: 0x23, g: 0x30, b: 0x3f },
    { r: 0x16, g: 0x20, b: 0x2b },
  ],
} as const

export type BackdropState = {
  backdrop: Backdrop | null
}
