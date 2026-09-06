import { t } from '@lingui/core/macro'
import type { Wait } from '../waiting.types'

// How much of what is being waited on the title carries. Past this the toast
// runs to a third line and the reason it opens with is read as a heading over
// a paragraph instead of a sentence.
const ABOUT_MAX = 60

// The title of the toast that says a run has stopped for the person. It leads
// with the reason, because the chat's own title says who is waiting and never
// what for: a permission names what would be touched, a question quotes
// itself. The reminder is the same line with the waiting spelt as continuing,
// so a second word about one wait reads as that wait and not a second one.
export function toastTitleOf(wait: Wait, again: boolean): string {
  const head = heading(wait.kind, again)
  const about = wait.kind === 'permission' ? named(wait.target || wait.said) : excerpt(wait.said)
  return about.length === 0 ? head : `${head} · ${about}`
}

// The chat a wait belongs to, as the line under the reason. A chat is named
// after the first thing said in it, which can run for paragraphs, and a chat
// with no title yet says nothing rather than standing in with a placeholder.
export function toastNoteOf(wait: Wait): string | undefined {
  return wait.title.length > 0 ? excerpt(wait.title) : undefined
}

// The words the sidebar dot already uses for the same state, so the row and
// the toast name one wait the same way.
function heading(kind: Wait['kind'], again: boolean): string {
  if (kind === 'permission') {
    return again ? t`Still waiting for your permission` : t`Waiting for your permission`
  }
  return again ? t`Still waiting for your answer` : t`Waiting for your answer`
}

// How a file is named in one line. The runtime hands over the whole path from
// the disk root, which on its own fills the toast and pushes the reason off
// the front of it, and a plain cut at the end would drop the file's own name,
// which is the part being decided about. The card behind the toast still
// carries the path whole.
const PATH_PARTS = 2

function named(target: string): string {
  const line = target.replace(/\s+/g, ' ').trim()
  // A command or a web address reads from its front; only a path reads from
  // its end.
  if (/\s/.test(line) || line.includes('://')) return excerpt(line)
  const parts = line.split(/[\\/]/).filter((one) => one.length > 0)
  return parts.length <= PATH_PARTS ? excerpt(line) : excerpt(parts.slice(-PATH_PARTS).join('/'))
}

function excerpt(said: string): string {
  const line = said.replace(/\s+/g, ' ').trim()
  if (line.length <= ABOUT_MAX) return line
  return `${line.slice(0, ABOUT_MAX - 1).trimEnd()}…`
}
