export function safeTarget(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  if (trimmed.startsWith('-')) return null
  if (/\s/.test(trimmed)) return null
  return trimmed
}
