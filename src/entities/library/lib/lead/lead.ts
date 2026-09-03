const HEADING = /^#{1,6}\s+/
const FENCE = /^(```|~~~)/

// The first paragraph of a note, as it was written. `summaryOf` flattens the
// markdown for a one-line row; this keeps it, so a card can render the lead
// the way the note reads.
export function leadOf(body: string): string {
  const said: string[] = []
  let fenced = false
  for (const line of body.split('\n')) {
    const trimmed = line.trim()
    if (FENCE.test(trimmed)) {
      fenced = !fenced
      continue
    }
    if (fenced) continue
    if (trimmed.length === 0) {
      // A blank line after words ends the paragraph; before them it is nothing.
      if (said.length > 0) break
      continue
    }
    // A heading names what follows rather than saying it.
    if (said.length === 0 && HEADING.test(trimmed)) continue
    said.push(trimmed)
  }
  return said.join('\n')
}
