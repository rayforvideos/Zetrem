import { STREAM_BUFFER, TRANSCRIPT_BUFFER } from '../session'
import type { AgentSession, Call, TranscriptEntry } from '../session.types'

type Listener = () => void

let sessions: AgentSession[] = []
const listeners = new Set<Listener>()

function emit(next: AgentSession[]): void {
  sessions = next
  for (const listener of listeners) listener()
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
    emit(sessions.map((s) => (s.id === id ? { ...s, ...stamped } : s)))
  },
  appendTranscript(id: string, entry: TranscriptEntry): void {
    const target = sessions.find((s) => s.id === id)
    if (!target) return
    const transcript = [...target.transcript, entry].slice(-TRANSCRIPT_BUFFER)
    const lastSeenAtMs = Date.now()
    emit(sessions.map((s) => (s.id === id ? { ...s, transcript, lastSeenAtMs } : s)))
  },
  beginCall(id: string, call: { id: string; line: string }): void {
    const target = sessions.find((s) => s.id === id)
    if (!target) return
    const opened: Call = {
      ...call,
      startedAtMs: Date.now(),
      endedAtMs: null,
      failed: false,
      note: '',
    }
    const stream = [...target.stream, opened].slice(-STREAM_BUFFER)
    const lastSeenAtMs = Date.now()
    emit(sessions.map((s) => (s.id === id ? { ...s, stream, lastSeenAtMs } : s)))
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
    emit(sessions.map((s) => (s.id === id ? { ...s, stream, lastSeenAtMs } : s)))
  },
  clear(): void {
    emit([])
  },
}
