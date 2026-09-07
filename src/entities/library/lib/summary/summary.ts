const SUMMARY_MAX = 200
const TITLE_MAX = 60
const HEADING = /^#{1,6}\s+(.+?)\s*#*\s*$/
const FENCE = /^(```|~~~)/
const SENTENCE_END = /[.!?。！？]/
const FORBIDDEN_IN_NAME = /[/\\:*?"<>|]/g
const ELLIPSIS = '…'
// Trailing punctuation left dangling by the cut: it belonged to the words that
// were dropped, so it reads as damage rather than as writing.
const DANGLING = /[\s,;:·、，]+$/
const TRAILING_STOPS = /\.+$/
// A space nearer the start than this leaves too little of the sentence to be
// worth reading, so a run that long without one is cut where it must be. The
// mark still says it was cut, whichever of the two happened.
const BOUNDARY_FLOOR = 0.5

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

// Ends on a word wherever the text gives one to end on, and always says that
// it ended early. A cut with nothing to mark it reads as a sentence someone
// forgot to finish, which is what a title is least able to afford.
function cut(text: string, max: number): string {
  if (text.length <= max) return text
  const room = text.slice(0, max - ELLIPSIS.length)
  const space = room.lastIndexOf(' ')
  const kept = space > max * BOUNDARY_FLOOR ? room.slice(0, space) : room
  return `${kept.replace(DANGLING, '')}${ELLIPSIS}`
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
  // The mark the cut left stays: a title that ends mid-thought has to say so,
  // or every long answer is filed under a sentence that looks broken. Only a
  // full stop is taken off, and only when the title was short enough to keep
  // whole, since a name ending in one could not be typed back in.
  return cut(named, TITLE_MAX).replace(TRAILING_STOPS, '').trim() || 'Untitled'
}

// Whether the body would only repeat the title. A short answer filed to the
// library becomes a note whose title is the whole of it, and a reader that
// prints both shows the same sentence twice with nothing between them.
export function bodyEchoesTitle(title: string, body: string): boolean {
  const said = plain(body).replace(TRAILING_STOPS, '').trim()
  return said.length > 0 && said === title.replace(TRAILING_STOPS, '').trim()
}
