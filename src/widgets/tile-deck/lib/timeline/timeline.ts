import type { AgentSession } from '@/entities/agent-session'
import type { TimelineItem } from './timeline.types'

function timeOf(item: TimelineItem): number {
  return item.kind === 'said' ? (item.entry.atMs ?? 0) : item.call.startedAtMs
}

// The left pane's whole story: what the teammate said and what it did,
// merged into the one order things actually happened in. Entries said before
// this was tracked carry no atMs, so they sort as if said at the very start —
// which is where they belong, since nothing here predates them.
export function timelineOf(session: AgentSession): TimelineItem[] {
  const said: TimelineItem[] = session.transcript.map((entry) => ({ kind: 'said', entry }))
  const calls: TimelineItem[] = session.stream.map((call) => ({ kind: 'call', call }))
  return [...said, ...calls].toSorted((a, b) => timeOf(a) - timeOf(b))
}
