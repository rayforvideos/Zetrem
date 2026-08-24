import type { Turn } from '../../model/turn'

export type ChatSummary = {
  id: string
  title: string
  sessionId: string | null
  savedAtMs: number
  // Where the person filed it. Empty means they never did, which is where
  // every chat saved before folders existed starts.
  folder: string
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
