export function nameInFrontmatter(text: string): string | null {
  if (!text.startsWith('---')) return null
  const end = text.indexOf('\n---', 3)
  if (end === -1) return null
  const found = /^name:\s*(.+)$/m.exec(text.slice(3, end))
  const said = found?.[1]?.trim().replace(/^['"]|['"]$/g, '') ?? ''
  return said.length > 0 ? said : null
}
