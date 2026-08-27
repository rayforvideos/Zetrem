import type { NoteParts } from './note-parts.types'

const HEADING = /^#{1,6}\s/
const LIST = /^([-*+]\s|\d+[.)]\s)/
const FENCE = /^(```|~~~)/
const SENTENCE_END = /[.。?!]$/
const PROJECT_MAX = 60

function plain(line: string): boolean {
  const trimmed = line.trim()
  return !HEADING.test(trimmed) && !LIST.test(trimmed) && !FENCE.test(trimmed)
}

function nextWritten(lines: string[], from: number): number {
  for (let at = from; at < lines.length; at += 1) {
    if ((lines[at] ?? '').trim().length > 0) return at
  }
  return -1
}

function rest(lines: string[], after: number): string {
  const tail = lines.slice(after + 1)
  while (tail.length > 0 && (tail[0] ?? '').trim().length === 0) tail.shift()
  return tail.join('\n')
}

export function noteParts(text: string): NoteParts {
  const whole = { conclusion: null, project: null, body: text }
  const lines = text.split('\n')

  const first = nextWritten(lines, 0)
  if (first === -1) return whole
  const head = lines[first] ?? ''
  if (!plain(head)) return whole

  const second = nextWritten(lines, first + 1)
  const candidate = (lines[second] ?? '').trim()
  const isProject =
    second !== -1 &&
    plain(candidate) &&
    candidate.length <= PROJECT_MAX &&
    !SENTENCE_END.test(candidate)

  return {
    conclusion: head.trim(),
    project: isProject ? candidate : null,
    body: rest(lines, isProject ? second : first),
  }
}
