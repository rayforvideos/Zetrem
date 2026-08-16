import type { ResultMetrics } from '../../api/claude/status/status.types'
import type { StatusState } from '../status-store/status-store.types'

type Spend = StatusState['cost']

function anyTokens(tokens: Spend['tokens']): boolean {
  return tokens.in + tokens.out + tokens.cacheRead + tokens.cacheCreate > 0
}

export function spentAfter(before: Spend, metrics: ResultMetrics): Spend {
  const usd = Math.max(before.usd, metrics.costUsd)
  return {
    usd,
    lastTurnUsd: Math.max(0, usd - before.usd),
    tokens: anyTokens(metrics.tokens) || !anyTokens(before.tokens) ? metrics.tokens : before.tokens,
    durationMs: metrics.durationMs,
    ttftMs: metrics.ttftMs,
    turns: Math.max(before.turns, metrics.turns),
  }
}
