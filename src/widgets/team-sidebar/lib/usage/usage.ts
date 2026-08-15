import type { UsageRow } from './usage.types'

import type { StatusState } from '@/entities/agent-session'
import { formatResetTime } from '@/shared/lib/datetime/datetime'
import { formatTokens, limitKindLabel } from '@/shared/lib/units/units'

const CONTEXT_WARN = 0.85
const LIMIT_WARN = 0.85

export function usageRows(status: StatusState): UsageRow[] {
  return [...accountRows(status), ...contextRow(status)]
}

function resetLine(limit: StatusState['limits'][number]): string {
  if (limit.overage) return 'on overage'
  if (limit.resetsText !== undefined) return `resets ${limit.resetsText}`
  if (limit.resetsAtMs > 0) return `resets ${formatResetTime(limit.resetsAtMs)}`
  return 'reset time not reported'
}

function accountRows(status: StatusState): UsageRow[] {
  return status.limits.map((limit) => ({
    key: limit.kind,
    label: limitKindLabel(limit.kind),
    percent: Math.round(limit.utilization * 100),
    amount: null,
    hint: resetLine(limit),
    warn: limit.status !== 'allowed' || limit.overage || limit.utilization >= LIMIT_WARN,
  }))
}

function contextRow(status: StatusState): UsageRow[] {
  const { used, window } = status.context
  if (used === 0) return []
  if (window === null || window <= 0) {
    return [
      {
        key: 'context',
        label: 'This chat',
        percent: null,
        amount: formatTokens(used),
        hint: 'window size not reported yet',
        warn: false,
      },
    ]
  }
  const share = used / window
  return [
    {
      key: 'context',
      label: 'This chat',
      percent: Math.round(share * 100),
      amount: null,
      hint: share >= CONTEXT_WARN ? 'compacting soon' : 'of the context window',
      warn: share >= CONTEXT_WARN,
    },
  ]
}

export function spendLine(status: StatusState): string | null {
  if (status.cost.usd <= 0) return null
  const turns = status.cost.turns
  const said = turns === 1 ? '1 turn' : `${turns.toLocaleString('en-US')} turns`
  return `$${status.cost.usd.toFixed(2)} over ${said}`
}

export function waitingLine(status: StatusState, sessionLive: boolean): string | null {
  if (usageRows(status).length > 0 || spendLine(status) !== null) return null
  if (!sessionLive) return 'Usage shows up once a chat is under way'
  return 'Counting, the first reply carries the numbers'
}

