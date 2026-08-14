import type { Metric } from '../metric'

export const contextMetric: Metric = {
  id: 'context',
  label: 'Context',
  unit: '%',
  read: (session) => session.contextUsed * 100,
  format: (value) => `${value.toFixed(0)}%`,
}
