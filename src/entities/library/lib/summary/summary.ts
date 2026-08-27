const SUMMARY_MAX = 200
const TITLE_MAX = 60
const HEADING = /^#{1,6}\s+(.+?)\s*#*\s*$/
const FENCE = /^(```|~~~)/
const SENTENCE_END = /[.!?。！？]/
const FORBIDDEN_IN_NAME = /[/\\:*?"<>|]/g

function plain(text: string): string {
  return text
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(\*|_)(.+?)\1/g, '$2')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

function cut(text: string, max: number): string {
  if (text.length <= max) return text
  const room = text.slice(0, max - 1)
  const space = room.lastIndexOf(' ')
  return `${(space > max / 2 ? room.slice(0, space) : room).trimEnd()}…`
}

function paragraphs(body: string): string[] {
  const out: string[] = []
  let current: string[] = []
  let fenced = false
  for (const line of body.split('\n')) {
    if (FENCE.test(line.trim())) {
      fenced = !fenced
      continue
    }
    if (fenced) continue
    if (line.trim().length === 0) {
      if (current.length > 0) out.push(current.join(' '))
      current = []
      continue
    }
    current.push(line.trim())
  }
  if (current.length > 0) out.push(current.join(' '))
  return out
}

export function summaryOf(body: string): string {
  for (const paragraph of paragraphs(body)) {
    if (HEADING.test(paragraph)) continue
    const said = plain(paragraph)
    if (said.length > 0) return cut(said, SUMMARY_MAX)
  }
  return ''
}

function firstSentence(text: string): string {
  const at = text.search(SENTENCE_END)
  return at === -1 ? text : text.slice(0, at)
}

export function titleFrom(text: string): string {
  const parts = paragraphs(text)
  const heading = parts.map((one) => HEADING.exec(one)?.[1] ?? null).find((one) => one !== null)
  const raw = heading ?? parts.map((one) => firstSentence(plain(one))).find((one) => one.length > 0)
  const named = plain(raw ?? '')
    .replace(FORBIDDEN_IN_NAME, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (named.length === 0) return 'Untitled'
  return cut(named, TITLE_MAX).replace(/…$/, '').trim() || 'Untitled'
}
