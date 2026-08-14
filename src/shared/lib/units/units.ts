export function formatTokens(tokens: number): string {
  if (tokens < 1000) return `${tokens}`
  return `${(tokens / 1000).toFixed(1)}k`
}

export function limitKindLabel(kind: string): string {
  switch (kind) {
    case 'five_hour':
      return '5-hour'
    case 'seven_day':
    case 'seven_day_oauth':
      return 'Weekly'
    case 'seven_day_overage':
      return 'Weekly overage'
    default:
      return kind.startsWith('seven_day_') ? `Weekly ${titled(kind.slice('seven_day_'.length))}` : kind
  }
}

function titled(name: string): string {
  return name
    .split('_')
    .filter((word) => word.length > 0)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(' ')
}
