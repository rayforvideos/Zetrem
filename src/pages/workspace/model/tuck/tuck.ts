import { SIDEBAR } from '@/shared/config/theme'

export function tuckedBy(open: boolean, measuredW: number, fallbackW: number): number {
  if (open) return 0
  const width = measuredW > 0 ? measuredW : fallbackW
  return -(width + SIDEBAR.gap)
}
