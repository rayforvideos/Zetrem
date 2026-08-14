export function formatTokens(tokens: number): string {
  if (tokens < 1000) return `${tokens}`
  return `${(tokens / 1000).toFixed(1)}k`
}

export function limitKindLabel(kind: string): string {
  if (kind === 'seven_day') return '7일'
  if (kind === 'five_hour') return '5시간'
  return kind
}
