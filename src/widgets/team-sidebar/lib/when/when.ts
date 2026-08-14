const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function whenLabel(savedAtMs: number, nowMs: number): string {
  const gap = nowMs - savedAtMs
  if (gap < MINUTE) return 'just now'
  if (gap < HOUR) return `${Math.floor(gap / MINUTE)}m ago`
  if (gap < DAY) return `${Math.floor(gap / HOUR)}h ago`
  if (gap < 7 * DAY) return `${Math.floor(gap / DAY)}d ago`
  return new Date(savedAtMs).toLocaleDateString('en-CA')
}
