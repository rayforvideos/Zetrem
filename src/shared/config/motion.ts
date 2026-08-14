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
  /**
   * 틴트가 배경 밝기를 따라가는 시간 (스펙 §4.1 "부드럽게").
   * 병합과 같은 길이로 두었다 — 타일이 움직여 자리가 바뀌면 틴트도 그 움직임과 함께
   * 끝나야 한다. 이름을 따로 두는 것은 색이 바뀌는 일이 위치가 바뀌는 일과 다른 현상이라서다.
   */
  tintMs: 400,
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

/**
 * 끝난 타일이 스스로 닫히기 전까지의 최소 체류시간.
 * 몇 초 만에 끝나는 서브에이전트는 타일이 눈으로 좇을 수 없게 번쩍이고 사라진다
 * (2026-08-13 화면 녹화로 발견) — 태어난 타일은 읽을 수 있을 만큼 살아야 한다.
 * 분할(fanMs)을 보고, 이름과 마지막 말을 읽는 시간이다.
 */
export const TILE_MIN_DWELL_MS = 4000
