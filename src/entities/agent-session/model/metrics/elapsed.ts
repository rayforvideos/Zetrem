import type { Metric } from '../metric'

export const elapsedMetric: Metric = {
  id: 'elapsed',
  label: '경과',
  unit: 's',
  read: (session, nowMs) => Math.max(0, Math.floor((nowMs - session.startedAtMs) / 1000)),
  format: (value) => {
    const minutes = Math.floor(value / 60)
    const seconds = value % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  },
}
