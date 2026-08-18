import { i18n } from '@lingui/core'
import { t } from '@lingui/core/macro'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function whenLabel(savedAtMs: number, nowMs: number): string {
  const gap = nowMs - savedAtMs
  if (gap < MINUTE) return t`just now`
  if (gap < HOUR) return t`${Math.floor(gap / MINUTE)}m ago`
  if (gap < DAY) return t`${Math.floor(gap / HOUR)}h ago`
  if (gap < 7 * DAY) return t`${Math.floor(gap / DAY)}d ago`
  return new Date(savedAtMs).toLocaleDateString(i18n.locale === 'ko' ? 'ko-KR' : 'en-CA')
}
