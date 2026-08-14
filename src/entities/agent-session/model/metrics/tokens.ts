import type { Metric } from '../metric'

export const tokensMetric: Metric = {
  id: 'tokens',
  label: 'Tokens',
  unit: 'tok',
  read: (session) => session.tokens,
  format: (value) => value.toLocaleString('ko-KR'),
}
