import { STREAM_BUFFER, TRANSCRIPT_BUFFER } from '../session'
import type { AgentSession, TranscriptEntry } from '../session.types'

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
    const stamped = { ...patch, ...waitingStamp(before, patch), ...endStamp(before, patch) }
    emit(sessions.map((s) => (s.id === id ? { ...s, ...stamped } : s)))
  },
  appendTranscript(id: string, entry: TranscriptEntry): void {
    const target = sessions.find((s) => s.id === id)
    if (!target) return
    const transcript = [...target.transcript, entry].slice(-TRANSCRIPT_BUFFER)
    emit(sessions.map((s) => (s.id === id ? { ...s, transcript } : s)))
  },
  pushStream(id: string, line: string): void {
    const target = sessions.find((s) => s.id === id)
    if (!target) return
    const stream = [...target.stream, line].slice(-STREAM_BUFFER)
    emit(sessions.map((s) => (s.id === id ? { ...s, stream } : s)))
  },
  remove(id: string): void {
    if (!sessions.some((s) => s.id === id)) return
    emit(sessions.filter((s) => s.id !== id))
  },
  clear(): void {
    emit([])
  },
}
