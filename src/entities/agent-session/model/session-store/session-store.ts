import { STREAM_BUFFER, TRANSCRIPT_BUFFER } from '../session/session'
import { absorbs, mergedLine } from '../../lib/call-line/call-line'
import type { AgentSession, Call, TranscriptEntry } from '../session/session.types'

type Listener = () => void

let sessions: AgentSession[] = []
const listeners = new Set<Listener>()

function emit(next: AgentSession[]): void {
  sessions = next
  for (const listener of listeners) listener()
}

function patchOne(id: string, fields: Partial<AgentSession>): void {
  emit(sessions.map((s) => (s.id === id ? { ...s, ...fields } : s)))
}

function waitingStamp(before: AgentSession, patch: Partial<AgentSession>): Partial<AgentSession> {
  if (patch.waitingSinceMs !== undefined) return {}
  if (patch.status === undefined || patch.status === before.status) return {}
  return patch.status === 'waiting' ? { waitingSinceMs: Date.now() } : { waitingSinceMs: undefined }
}

function seenStamp(patch: Partial<AgentSession>): Partial<AgentSession> {
  if (patch.lastSeenAtMs !== undefined) return {}
  if (patch.status !== 'working' && patch.status !== 'reported') return {}
  return { lastSeenAtMs: Date.now() }
}

function endStamp(before: AgentSession, patch: Partial<AgentSession>): Partial<AgentSession> {
  if (patch.endedAtMs !== undefined) return {}
  if (patch.status !== 'done' || before.status === 'done') return {}
  return { endedAtMs: Date.now() }
}

export const sessionStore = {
  get(): AgentSession[] {
    return sessions
  },
  find(id: string): AgentSession | null {
    return sessions.find((session) => session.id === id) ?? null
  },
  findByTask(taskId: string): AgentSession | null {
    return sessions.find((session) => session.taskId === taskId) ?? null
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  open(session: AgentSession): void {
    emit([...sessions, session])
  },
  patch(id: string, patch: Partial<AgentSession>): void {
    const before = sessions.find((s) => s.id === id)
    if (!before) return
    const stamped = {
      ...patch,
      ...seenStamp(patch),
      ...waitingStamp(before, patch),
      ...endStamp(before, patch),
    }
    patchOne(id, stamped)
  },
  appendTranscript(id: string, entry: TranscriptEntry): void {
    const target = sessions.find((s) => s.id === id)
    if (!target) return
    const transcript = [...target.transcript, entry].slice(-TRANSCRIPT_BUFFER)
    const lastSeenAtMs = Date.now()
    patchOne(id, { transcript, lastSeenAtMs })
  },
  beginCall(id: string, call: { id: string; line: string }): void {
    const target = sessions.find((s) => s.id === id)
    if (!target) return
    const open = target.stream.findLastIndex(
      (already) => already.id === call.id && already.endedAtMs === null,
    )
    if (open !== -1) {
      const held = target.stream[open]!
      const again = target.stream.with(open, {
        ...held,
        line: mergedLine(held.line, call.line),
      })
      patchOne(id, { stream: again, lastSeenAtMs: Date.now() })
      return
    }
    const last = target.stream.length - 1
    const held = target.stream[last]
    if (held !== undefined && absorbs(held.line, call.line)) {
      const taken = target.stream.with(last, {
        ...held,
        id: call.id,
        line: call.line,
        endedAtMs: null,
        failed: false,
        note: '',
      })
      patchOne(id, { stream: taken, lastSeenAtMs: Date.now() })
      return
    }
    const opened: Call = {
      ...call,
      startedAtMs: Date.now(),
      endedAtMs: null,
      failed: false,
      note: '',
    }
    const stream = [...target.stream, opened].slice(-STREAM_BUFFER)
    const lastSeenAtMs = Date.now()
    patchOne(id, { stream, lastSeenAtMs })
  },
  endCall(id: string, callId: string, done: { failed: boolean; note: string }): void {
    const target = sessions.find((s) => s.id === id)
    if (!target) return
    const at = target.stream.findLastIndex((call) => call.id === callId)
    if (at === -1) return
    const stream = target.stream.with(at, {
      ...target.stream[at]!,
      ...done,
      endedAtMs: Date.now(),
    })
    const lastSeenAtMs = Date.now()
    patchOne(id, { stream, lastSeenAtMs })
  },
  clear(): void {
    emit([])
  },
}
