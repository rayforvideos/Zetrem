import { msg } from '@lingui/core/macro'
import type { Metric } from './metric'

export const contextMetric: Metric = {
  id: 'context',
  label: msg`context`,
  unit: '%',
  known: (session) => session.contextUsed > 0,
  read: (session) => session.contextUsed * 100,
  format: (value) => `${value.toFixed(0)}%`,
}
