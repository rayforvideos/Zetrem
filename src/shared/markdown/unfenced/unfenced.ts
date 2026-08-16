const WHOLE = /^```(?:markdown|md)[ \t]*\r?\n([\s\S]*?)\r?\n?```$/

export function unfenced(text: string): string {
  const said = text.trim()
  const held = WHOLE.exec(said)
  if (held === null) return text
  const inside = held[1] ?? ''
  return inside.includes('```') ? text : inside
}
