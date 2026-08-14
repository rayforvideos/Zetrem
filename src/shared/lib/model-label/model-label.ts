const FAMILIES = ['fable', 'opus', 'sonnet', 'haiku'] as const

export function modelLabel(id: string | null): string | null {
  if (id === null) return null
  const trimmed = id.trim()
  if (trimmed.length === 0) return null
  const lower = trimmed.toLowerCase()
  const family = FAMILIES.find((name) => lower.includes(name))
  if (family === undefined) return trimmed
  return family[0]!.toUpperCase() + family.slice(1)
}
