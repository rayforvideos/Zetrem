export function mergedLine(before: string, after: string): string {
  const kept = before.trim()
  const said = after.trim()
  if (said.length === 0) return kept
  if (kept.length === 0) return said
  return said.length > kept.length ? said : kept
}

export function absorbs(kept: string, coming: string): boolean {
  const bare = kept.trim()
  const full = coming.trim()
  if (bare.length === 0 || bare.includes(' ')) return false
  return full.startsWith(`${bare} `)
}
