export const MOTION = {
  fanMs: 500,
  mergeMs: 400,
  staggerMs: 60,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const

export const LAYOUT = {
  outerMarginPx: 48,
  gapPx: 16,
  soloInsetRatio: 0,
} as const

export function staggerDelay(index: number): number {
  return index * MOTION.staggerMs
}

export const TILE_MIN_DWELL_MS = 4000
