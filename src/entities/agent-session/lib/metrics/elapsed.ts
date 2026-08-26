import type { Metric } from './metric'

import { formatClock } from '@/shared/lib/units/units'

export const elapsedMetric: Metric = {
  id: 'elapsed',
  label: 'elapsed',
  unit: 's',
  known: () => true,
  read: (session, nowMs) =>
    Math.max(0, Math.floor(((session.endedAtMs ?? nowMs) - session.startedAtMs) / 1000)),
  format: (value) => formatClock(value),
}
