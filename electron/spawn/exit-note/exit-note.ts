import type { ErrorLines, ExitNote } from './exit-note.types'

const STDERR_KEEP = 20
const STDERR_WIDTH = 200

// A log a person can send us must not carry what would let anyone run as them.
// The token shapes go first: a header rule would otherwise blank the word
// 'Bearer' and leave the token standing behind it.
const SECRETS: { find: RegExp; put: string }[] = [
  // An API key, which the CLI prints back when it refuses one.
  { find: /\bsk-[A-Za-z0-9_-]{12,}/g, put: '[redacted]' },
  // A JSON web token: the shape an OAuth access or refresh token takes.
  { find: /\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, put: '[redacted]' },
  { find: /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi, put: '$1 [redacted]' },
  {
    find: /((?:api[_-]?key|access[_-]?token|refresh[_-]?token|auth[_-]?token|token|secret|password|passwd)s?["']?\s*[:=]\s*["']?)(?!\[redacted\])([^\s"',;}]{6,})/gi,
    put: '$1[redacted]',
  },
]

export function redacted(line: string): string {
  let said = line
  for (const rule of SECRETS) said = said.replace(rule.find, rule.put)
  return said
}

// Named by their codes, not written out: an escape character sitting in a
// source file is invisible to whoever reads it next.
const ESCAPE = String.fromCharCode(27)
const DELETE = String.fromCharCode(127)
const COLOUR = new RegExp(`${ESCAPE}\\[[0-9;]*[A-Za-z]`, 'g')

// One exit is one line, and a colour code or the carriage return a progress bar
// draws itself with would end that the moment either reached the file.
function plain(line: string): string {
  let out = ''
  for (const one of line.replace(COLOUR, '')) out += one < ' ' || one === DELETE ? ' ' : one
  return out
}

function shaped(line: string, width: number): string {
  const said = redacted(plain(line).trim())
  if (said.length === 0) return ''
  return said.length > width ? `${said.slice(0, width)}…` : said
}

// A ring: the newest lines only, so a session that talked for an hour still
// costs the same handful of strings as one that said nothing.
export function errorLines(keep: number = STDERR_KEEP, width: number = STDERR_WIDTH): ErrorLines {
  const held: string[] = []
  let open = ''
  let dropping = false

  function add(line: string): void {
    const said = shaped(line, width)
    if (said.length === 0) return
    held.push(said)
    if (held.length > keep) held.shift()
  }

  return {
    take(chunk: string): void {
      const parts = (open + chunk).split('\n')
      open = parts.pop() ?? ''
      for (const part of parts) {
        if (dropping) {
          dropping = false
          continue
        }
        add(part)
      }
      // A line longer than the log wants is cut here rather than held whole:
      // the rest of it is dropped when its newline finally arrives.
      if (open.length > width) {
        add(open)
        open = ''
        dropping = true
      }
    },
    lines(): string[] {
      const tail = shaped(open, width)
      const all = tail.length === 0 ? held : [...held, tail]
      return all.slice(-keep)
    },
  }
}

export function upFor(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  if (total < 60) return `${total}s`
  const minutes = Math.floor(total / 60)
  if (minutes < 60) return `${minutes}m${String(total % 60).padStart(2, '0')}s`
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}m`
}

// One line, one death: written so a person can find a chat in the log by eye
// and grep can find every unasked exit at once.
export function exitNoteLine(note: ExitNote): string {
  const head = [
    `chat=${note.chat ?? '?'}`,
    `host=${note.host}`,
    `up=${upFor(note.upMs)}`,
    `ended=${note.ended.length > 0 ? note.ended : '?'}`,
    `asked=${note.asked ? 'yes' : 'no'}`,
  ].join(' ')
  const tail = note.stderr.length === 0 ? 'none' : note.stderr.join(' | ')
  return `${head} stderr=${tail}`
}
