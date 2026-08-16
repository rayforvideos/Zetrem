import type { StatusState } from '@/entities/agent-session'
import type { Mark } from './strip.types'
import { formatResetTime, untilLabel } from '@/shared/lib/datetime/datetime'
import { formatTokens, limitKindLabel, limitTag } from '@/shared/lib/units/units'

const WARN = 0.85

function resetHint(limit: StatusState['limits'][number]): string {
  if (limit.overage) return 'on overage'
  if (limit.resetsText !== undefined) return `resets ${limit.resetsText}`
  if (limit.resetsAtMs > 0) return `resets ${formatResetTime(limit.resetsAtMs)}`
  return 'reset time not reported'
}

function leftLabel(limit: StatusState['limits'][number], nowMs: number): string | null {
  if (limit.overage) return null
  if (limit.resetsAtMs > 0) {
    const left = limit.resetsAtMs - nowMs
    return left > 0 ? `${untilLabel(left)} left` : null
  }
  if (limit.resetsText !== undefined && limit.resetsText.length > 0) {
    return `resets ${limit.resetsText}`
  }
  return null
}

export function marksOfStatus(status: StatusState, nowMs = Date.now()): Mark[] {
  return status.limits.map((limit) => {
    const percent = limit.utilization === null ? null : Math.round(limit.utilization * 100)
    const share = percent === null ? 'share unknown' : `${percent}% used`
    return {
      key: limit.kind,
      label: limitTag(limit.kind),
      percent,
      left: leftLabel(limit, nowMs),
      hint: `${limitKindLabel(limit.kind)} · ${share} · ${resetHint(limit)}`,
      warn: limit.status !== 'allowed' || limit.overage || (limit.utilization ?? 0) >= WARN,
    }
  })
}

export function chatLine(status: StatusState): string | null {
  const { used, window } = status.context
  if (used === 0) return null
  if (window === null || window <= 0) return `this chat ${formatTokens(used)}`
  return `this chat ${Math.round((used / window) * 100)}%`
}

export function spendLine(status: StatusState): string | null {
  if (status.cost.usd <= 0) return null
  return `$${status.cost.usd.toFixed(2)}`
}

export function quietLine(status: StatusState): string | null {
  if (status.limits.length > 0 || chatLine(status) !== null) return null
  if (status.usage === 'unread') return 'Reading usage…'
  if (status.usage === 'unreadable') return 'Could not read usage'
  return 'No account limits reported'
}
