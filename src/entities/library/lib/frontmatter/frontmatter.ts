import type { NoteMeta, ParsedNote } from './frontmatter.types'

const FENCE = '---'
const KNOWN = new Set(['title', 'created', 'updated', 'tags', 'source'])
const NEEDS_QUOTING = /^[\s"'#&*!|>%@`{[\]}]|[:#]|^\s*$|^(true|false|null|~)$|^-?\d/i

function quoted(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function scalar(value: string): string {
  return NEEDS_QUOTING.test(value) ? quoted(value) : value
}

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
  const rest: Record<string, string> = {}
  for (const [key, value] of fields) {
    if (!KNOWN.has(key)) rest[key] = unquoted(value)
  }
  return {
    meta: {
      title: unquoted(fields.get('title') ?? ''),
      created: unquoted(fields.get('created') ?? ''),
      updated: unquoted(fields.get('updated') ?? ''),
      tags: tagsOf(fields.get('tags') ?? ''),
      source: unquoted(fields.get('source') ?? ''),
      rest,
    },
    // serializeNote ends the file with one newline; it is not part of the body.
    body: lines
      .slice(end + 1)
      .join('\n')
      .replace(/\n$/, ''),
  }
}

export function serializeNote(meta: NoteMeta, body: string): string {
  const head = [FENCE, `title: ${scalar(meta.title)}`]
  if (meta.created.length > 0) head.push(`created: ${meta.created}`)
  if (meta.updated.length > 0) head.push(`updated: ${meta.updated}`)
  if (meta.tags.length > 0) head.push(`tags: [${meta.tags.map(scalar).join(', ')}]`)
  if (meta.source.length > 0) head.push(`source: ${scalar(meta.source)}`)
  for (const [key, value] of Object.entries(meta.rest)) head.push(`${key}: ${scalar(value)}`)
  head.push(FENCE)
  const text = body.endsWith('\n') || body.length === 0 ? body : `${body}\n`
  return `${head.join('\n')}\n${text}`
}
