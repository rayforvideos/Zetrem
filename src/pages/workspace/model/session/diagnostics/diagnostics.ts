import type { CrewLogEntry } from '../agent-events/crew-log/crew-log.types'
import type { DiagnosticsAbout, DiagnosticsHead } from './diagnostics.types'

// The paste is read in a bug report, by whoever is looking at the code, so it
// is plain English and a fixed shape. It is not app text: nothing here goes
// through the catalogs, because translating a log line would only make the
// same stuck tile harder to explain.
const EVENT_W = 16

// An entry belongs to a teammate when it landed on that teammate's tile, or
// when it named the tool call or the task that tile stands for. The last two
// matter most: an event that found no seat is exactly the one worth reading,
// and it names ids rather than a seat.
export function aboutTeammate(entries: CrewLogEntry[], about: DiagnosticsAbout): CrewLogEntry[] {
  return entries.filter((one) => {
    if (one.seat === about.seat) return true
    if (one.toolUseId !== null && one.toolUseId === about.seat) return true
    return about.taskId !== null && one.taskId === about.taskId
  })
}

export function crewLogLine(entry: CrewLogEntry): string {
  const ids = [
    entry.seat === null ? null : `seat=${entry.seat}`,
    entry.toolUseId === null ? null : `tool=${entry.toolUseId}`,
    entry.taskId === null ? null : `task=${entry.taskId}`,
  ].filter((one): one is string => one !== null)
  const named = ids.length === 0 ? '-' : ids.join(' ')
  return `${new Date(entry.atMs).toISOString()}  ${entry.event.padEnd(EVENT_W)}  ${named}  ${entry.decision}`
}

export function diagnosticsText(entries: CrewLogEntry[], head: DiagnosticsHead): string {
  const shown = head.about === null ? entries : aboutTeammate(entries, head.about)
  const lines = ['Zetrem crew diagnostics']
  if (head.chat !== null) lines.push(`chat: ${head.chat}`)
  if (head.about !== null) lines.push(`teammate: ${teammateLine(head.about)}`)
  lines.push(`entries: ${shown.length} of ${entries.length}`)
  lines.push('')
  if (shown.length === 0) {
    lines.push('No crew events yet.')
    return `${lines.join('\n')}\n`
  }
  for (const one of shown) lines.push(crewLogLine(one))
  return `${lines.join('\n')}\n`
}

function teammateLine(about: DiagnosticsAbout): string {
  const task = about.taskId === null ? '' : `, task ${about.taskId}`
  return `${about.label} (seat ${about.seat}${task})`
}
