import type { StatusState } from '@/entities/agent-session'
import type { Mark } from './strip.types'
import { formatResetTime, untilLabel } from '@/shared/lib/datetime/datetime'
import { formatTokens, limitKindLabel, limitTag } from '@/shared/lib/units/units'
import { t } from '@lingui/core/macro'

const WARN = 0.85

function resetHint(limit: StatusState['limits'][number]): string {
  if (limit.overage) return t`on overage`
  if (limit.resetsText !== undefined) {
    const when = limit.resetsText
    return t`resets ${when}`
  }
  if (limit.resetsAtMs > 0) {
    const when = formatResetTime(limit.resetsAtMs)
    return t`resets ${when}`
  }
  return t`reset time not reported`
}

function leftLabel(limit: StatusState['limits'][number], nowMs: number): string | null {
  if (limit.overage) return null
  if (limit.resetsAtMs > 0) {
    const left = limit.resetsAtMs - nowMs
    return left > 0 ? t`${untilLabel(left)} left` : null
  }
  if (limit.resetsText !== undefined && limit.resetsText.length > 0) {
    const when = limit.resetsText
    return t`resets ${when}`
  }
  return null
}

// An overage-included limit is the CLI saying the plan already covers what was
// spent past a limit. That is a note about the bill, not a share of anything
// this strip has a meter for, so it stays out rather than arriving as a bare
// tag nobody asked for.
function drawn(limit: StatusState['limits'][number]): boolean {
  return !limit.kind.includes('overage_included')
}

export function marksOfStatus(status: StatusState, nowMs = Date.now()): Mark[] {
  const stale = status.usage === 'kept' ? ` · ${t`from an earlier reading`}` : ''
  return status.limits.filter(drawn).map((limit) => {
    const percent = limit.utilization === null ? null : Math.round(limit.utilization * 100)
    const share = percent === null ? t`share unknown` : t`${percent}% used`
    return {
      key: limit.kind,
      label: limitTag(limit.kind),
      percent,
      left: leftLabel(limit, nowMs),
      hint: `${limitKindLabel(limit.kind)} · ${share} · ${resetHint(limit)}${stale}`,
      warn: limit.status !== 'allowed' || limit.overage || (limit.utilization ?? 0) >= WARN,
    }
  })
}

export function chatLine(status: StatusState): string | null {
  const { used, window } = status.context
  if (used === 0) return null
  if (window === null || window <= 0) {
    const size = formatTokens(used)
    return t`this chat ${size}`
  }
  const percent = Math.round((used / window) * 100)
  return t`this chat ${percent}%`
}

export function quietLine(status: StatusState): string | null {
  if (status.limits.some(drawn) || chatLine(status) !== null) return null
  if (status.usage === 'unread') return t`Reading usage…`
  if (status.usage === 'unreadable') return t`Could not read usage`
  return t`No account limits reported`
}
