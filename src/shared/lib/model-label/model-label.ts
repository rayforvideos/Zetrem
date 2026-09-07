const FAMILIES = ['fable', 'opus', 'sonnet', 'haiku'] as const

// The family alone, and nothing when the id names none of them. modelLabel
// hands back whatever it was given so a chip always has something to show;
// where a placeholder like "subagent" or "unknown" must not reach the screen,
// the caller needs to be told that no family was found.
export function modelFamily(id: string | null): string | null {
  if (id === null) return null
  const lower = id.trim().toLowerCase()
  const family = FAMILIES.find((name) => lower.includes(name))
  if (family === undefined) return null
  return family[0]!.toUpperCase() + family.slice(1)
}

export function modelLabel(id: string | null): string | null {
  if (id === null) return null
  const trimmed = id.trim()
  if (trimmed.length === 0) return null
  return modelFamily(trimmed) ?? trimmed
}
