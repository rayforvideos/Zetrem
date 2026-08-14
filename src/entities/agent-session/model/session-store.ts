import { STREAM_BUFFER, TRANSCRIPT_BUFFER } from './session'
import type { AgentSession, TranscriptEntry } from './session'

type Listener = () => void

let sessions: AgentSession[] = []
const listeners = new Set<Listener>()

function emit(next: AgentSession[]): void {
  sessions = next
  for (const listener of listeners) listener()
}

/**
 * 대기로 들어간 순간을 여기서 찍는다.
 *
 * 러너가 찍게 하면 러너 수만큼 잊을 기회가 생긴다. 그리고 상태 전이를 *이전 값과 함께*
 * 볼 수 있는 곳은 스토어뿐이다 — 같은 상태로 다시 밀어 넣어도 시각이 초기화되지 않아야 한다.
 * 호출자가 값을 명시하면 그것을 존중한다.
 */
function waitingStamp(before: AgentSession, patch: Partial<AgentSession>): Partial<AgentSession> {
  if (patch.waitingSinceMs !== undefined) return {}
  if (patch.status === undefined || patch.status === before.status) return {}
  return patch.status === 'waiting' ? { waitingSinceMs: Date.now() } : { waitingSinceMs: undefined }
}

export const sessionStore = {
  get(): AgentSession[] {
    return sessions
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
    const stamped = { ...patch, ...waitingStamp(before, patch) }
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
  /** 닫힌 타일을 걷어낸다 — 관측기는 오래 켜두는 창이라 스토어가 무한히 자라면 안 된다 */
  remove(id: string): void {
    if (!sessions.some((s) => s.id === id)) return
    emit(sessions.filter((s) => s.id !== id))
  },
  clear(): void {
    emit([])
  },
}
