import type { Turn } from '../../model/turn'

export type ChatSummary = {
  id: string
  title: string
  sessionId: string | null
  savedAtMs: number
}

export type ChatSpend = {
  usd: number
  turns: number
  tokensOut: number
  tokensIn: number
  cacheRead: number
  cacheWrite: number
  durationMs: number
  contextUsed: number
  contextWindow: number | null
}

export type Transcript = ChatSummary & { turns: Turn[]; spend: ChatSpend | null }
