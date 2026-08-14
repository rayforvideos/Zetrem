export function formatTokens(tokens: number): string {
  if (tokens < 1000) return `${tokens}`
  return `${(tokens / 1000).toFixed(1)}k`
}

export function limitKindLabel(kind: string): string {
  if (kind === 'seven_day') return '7-day'
  if (kind === 'five_hour') return '5-hour'
  return kind
}
