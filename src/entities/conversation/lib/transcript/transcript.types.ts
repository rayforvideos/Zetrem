import type { Turn } from '../../model/turn'

export type ChatSummary = {
  id: string
  title: string
  sessionId: string | null
  savedAtMs: number
}

export type Transcript = ChatSummary & { turns: Turn[] }
