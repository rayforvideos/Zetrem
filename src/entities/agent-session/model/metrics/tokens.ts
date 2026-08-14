import type { Metric } from '../metric'

export const tokensMetric: Metric = {
  id: 'tokens',
  label: '토큰',
  unit: 'tok',
  read: (session) => session.tokens,
  format: (value) => value.toLocaleString('ko-KR'),
}
