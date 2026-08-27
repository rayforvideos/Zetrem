import type { Turn } from '../turn/turn'

export type ChatSummary = {
  id: string
  title: string
  sessionId: string | null
  savedAtMs: number
  // Empty means unfiled, which is also where every chat saved before folders existed starts.
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

// On disk: transcripts/<project>/<id>.json under userData. The old shape must stay readable.
// files people already have.
export type Transcript = ChatSummary & { turns: Turn[]; spend: ChatSpend | null }
