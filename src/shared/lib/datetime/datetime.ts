import { t } from '@lingui/core/macro'
export function formatResetTime(ms: number, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms))
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  const strip = (value: string) => value.replace(/^0/, '')
  return `${strip(get('month'))}/${strip(get('day'))} ${get('hour')}:${get('minute')}`
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function untilLabel(ms: number): string {
  if (ms <= 0) return t`any moment`
  if (ms < MINUTE) return t`under a minute`
  if (ms < HOUR) return `${Math.floor(ms / MINUTE)}m`
  if (ms < DAY) {
    const hours = Math.floor(ms / HOUR)
    const minutes = Math.floor((ms % HOUR) / MINUTE)
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
  const days = Math.floor(ms / DAY)
  const hours = Math.floor((ms % DAY) / HOUR)
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`
}
