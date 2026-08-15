export const MOTION = {
  fanMs: 500,
  mergeMs: 400,
  staggerMs: 60,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  arriveMs: 560,
  leaveMs: 220,
  spring:
    'linear(0, 0.0508, 0.1674, 0.3101, 0.4544, 0.5861, 0.6985, 0.7897, 0.8605, 0.9132, 0.9509, 0.9767, 0.9933, 1.0033, 1.0086, 1.0108, 1.011, 1.0101, 1.0087, 1.0071, 1.0055, 1.0041, 1.003, 1.002, 1.0013)',
  leaving: 'cubic-bezier(0.4, 0, 1, 1)',
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
