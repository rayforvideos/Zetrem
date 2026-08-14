import type { Metric } from '../metric'

export const contextMetric: Metric = {
  id: 'context',
  label: 'Context',
  unit: '%',
  known: (session) => session.contextUsed > 0,
  read: (session) => session.contextUsed * 100,
  format: (value) => `${value.toFixed(0)}%`,
}
