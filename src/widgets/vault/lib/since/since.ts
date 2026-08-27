import { i18n } from '@lingui/core'
import { t } from '@lingui/core/macro'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

// How long ago a note changed, in the shortest words that still say it.
export function sinceOf(updatedAtMs: number, nowMs: number): string {
  const gap = Math.max(0, nowMs - updatedAtMs)
  if (gap < MINUTE) return t`just now`
  if (gap < HOUR) {
    const n = Math.floor(gap / MINUTE)
    return t`${n}m ago`
  }
  if (gap < DAY) {
    const n = Math.floor(gap / HOUR)
    return t`${n}h ago`
  }
  if (gap < 7 * DAY) {
    const n = Math.floor(gap / DAY)
    return t`${n}d ago`
  }
  return new Date(updatedAtMs).toLocaleDateString(i18n.locale)
}
