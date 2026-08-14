import type { Metric } from '../metric'

export const contextMetric: Metric = {
  id: 'context',
  label: '컨텍스트',
  unit: '%',
  read: (session) => session.contextUsed * 100,
  format: (value) => `${value.toFixed(0)}%`,
}
