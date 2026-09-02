import type { RateLimit, SessionIdentity } from '@/entities/claude-cli/@x/agent-session'
import type { createChatStatus } from './status-store'

export type UpdateInfo = {
  current: string | null
  latest: string | null
  managedBy: string | null
}

type UsageRead = 'unread' | 'read' | 'unreadable' | 'kept'

export type ChatStatusState = {
  session: SessionIdentity | null
  probed: boolean
  context: { used: number; window: number | null }
  cost: {
    usd: number
    lastTurnUsd: number
    tokens: { in: number; out: number; cacheRead: number; cacheCreate: number }
    durationMs: number
    turns: number
  }
  activity: 'requesting' | 'idle'
}

export type AccountStatusState = {
  usage: UsageRead
  usageAtMs: number | null
  limits: RateLimit[]
  update: UpdateInfo | null
}

// What the widgets draw: the chat on screen and the account, as one object.
export type StatusState = ChatStatusState & AccountStatusState

export type ChatStatus = ReturnType<typeof createChatStatus>
