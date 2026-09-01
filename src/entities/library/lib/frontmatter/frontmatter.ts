import type { ParsedNote } from './frontmatter.types'

const FENCE = '---'

function unquoted(raw: string): string {
  const value = raw.trim()
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\')
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'")
  }
  return value
}

function tagsOf(raw: string): string[] {
  const value = raw.trim()
  if (!value.startsWith('[') || !value.endsWith(']')) return []
  return value
    .slice(1, -1)
    .split(',')
    .map((one) => unquoted(one))
    .filter((one) => one.length > 0)
}

function headOf(lines: string[]): number {
  if (lines[0] !== FENCE) return -1
  for (let at = 1; at < lines.length; at += 1) {
    if (lines[at] === FENCE) return at
  }
  return -1
}

export function parseNote(text: string): ParsedNote {
  const lines = text.split('\n')
  const end = headOf(lines)
  if (end === -1) return { meta: null, body: text }

  const fields = new Map<string, string>()
  for (const line of lines.slice(1, end)) {
    const at = line.indexOf(':')
    if (at <= 0) continue
    fields.set(line.slice(0, at).trim(), line.slice(at + 1))
  }
  return {
    meta: {
      title: unquoted(fields.get('title') ?? ''),
      created: unquoted(fields.get('created') ?? ''),
      updated: unquoted(fields.get('updated') ?? ''),
      tags: tagsOf(fields.get('tags') ?? ''),
      source: unquoted(fields.get('source') ?? ''),
    },
    // The head was written with one newline after the body; it is not part of it.
    body: lines
      .slice(end + 1)
      .join('\n')
      .replace(/\n$/, ''),
  }
}
