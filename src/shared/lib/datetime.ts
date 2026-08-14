export function formatResetTime(ms: number, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms))
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  const strip = (value: string) => value.replace(/^0/, '')
  return `${strip(get('month'))}월 ${strip(get('day'))}일 ${get('hour')}:${get('minute')}`
}
