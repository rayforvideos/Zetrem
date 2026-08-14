import { SIDEBAR } from '@/shared/config/theme'

export function clampWidth(px: number): number {
  if (!Number.isFinite(px)) return SIDEBAR.width
  return Math.min(SIDEBAR.max, Math.max(SIDEBAR.min, Math.round(px)))
}

export function draggedWidth(startWidth: number, deltaX: number): number {
  return clampWidth(startWidth + deltaX)
}

export function nudgedWidth(width: number, key: string): number | null {
  switch (key) {
    case 'ArrowLeft':
      return clampWidth(width - SIDEBAR.step)
    case 'ArrowRight':
      return clampWidth(width + SIDEBAR.step)
    case 'Home':
      return SIDEBAR.min
    case 'End':
      return SIDEBAR.max
    default:
      return null
  }
}
