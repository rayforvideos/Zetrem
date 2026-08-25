import { formatTokens } from '@/shared/lib/units/units'
import type { Metric } from './metric'

export const tokensMetric: Metric = {
  id: 'tokens',
  label: 'tokens',
  unit: 'tok',
  known: (session) => session.tokens > 0,
  read: (session) => session.tokens,
  format: (value) => formatTokens(value),
}
