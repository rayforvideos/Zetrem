import type { Turn } from '../turn/turn'

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

// On disk: transcripts/<project>/<id>.json under userData, read by
// readTranscript(). A change here is a change to files people already have.
export type Transcript = ChatSummary & { turns: Turn[]; spend: ChatSpend | null }
