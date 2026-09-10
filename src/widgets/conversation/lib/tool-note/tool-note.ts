import { plural, t } from '@lingui/core/macro'
import { withoutHarnessNote } from '@/entities/claude-cli'
import type { ToolShape } from '@/entities/tool'
import { heldLine } from '../limits/limits'

const NOTE_MAX = 48
const REPORT_MAX = 64

// The one thing a settled row says about what came back, in the language the
// app is speaking. The row used to say it twice, as an English note beside the
// target and as a count at the edge, leaving a reader to work out that the two
// were the same nine lines.
export function saidNote(shape: ToolShape, said: string | null): string | null {
  if (said === null) return null
  if (shape.kind === 'agent') return reportNote(said)
  const body = said.replace(/\n+$/, '')
  const lines = body.length === 0 ? [] : body.split('\n')
  if (shape.kind === 'search') {
    return lines.length === 0 ? t`none` : plural(lines.length, { one: '# hit', other: '# hits' })
  }
  if (shape.kind === 'command') {
    if (body.trim().length === 0) return t`no output`
    return lines.length === 1 ? clip(body.trim(), NOTE_MAX) : heldLine(lines.length)
  }
  return lines.length === 0 ? null : heldLine(lines.length)
}

// What went wrong, rather than how many lines the complaint ran to. The row is
// open on arrival when it failed, so this is the short of it and the output
// under the row is the whole of it.
export function failureNote(said: string | null): string {
  const first = firstSentence(said ?? '')
  return first.length === 0 ? t`failed` : first
}

// A teammate comes back with prose, and a report's first sentence is the
// report's own summary. How many lines it ran to says nothing about what was
// found or decided. When the CLI's guard flagged the report, its note stands
// in front of that first sentence, so it comes off before the sentence is read.
function reportNote(said: string): string {
  const first = firstSentence(withoutHarnessNote(said))
  return first.length === 0 ? t`reported` : first
}

// A stop after a shout in capitals is a shout, not the end of a sentence, and
// cutting there leaves "npm ERR!" standing for the whole complaint. A sentence
// this looks for ends on ordinary running text.
const SENTENCE_END = /[a-z0-9)\]'"][.!?](\s|$)/

export function firstSentence(text: string): string {
  const line =
    text
      .split('\n')
      .map((one) => one.trim())
      .find((one) => one.length > 0) ?? ''
  const end = line.search(SENTENCE_END)
  return clip(end === -1 ? line : line.slice(0, end + 2), REPORT_MAX)
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}
