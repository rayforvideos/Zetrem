import type { RateLimit, SessionIdentity } from '../../api/claude/status/status.types'

export type HookRun = { name: string; event: string; exitCode: number; ms: number }

export type UpdateInfo = {
  current: string | null
  latest: string | null
  managedBy: string | null
}

export type UsageRead = 'unread' | 'read' | 'unreadable'

export type StatusState = {
  usage: UsageRead
  usageAtMs: number | null
  session: SessionIdentity | null
  probed: boolean
  context: { used: number; window: number | null }
  cost: {
    usd: number
    lastTurnUsd: number
    tokens: { in: number; out: number; cacheRead: number; cacheCreate: number }
    durationMs: number
    ttftMs: number | null
    turns: number
  }
  limits: RateLimit[]
  hooks: HookRun[]
  update: UpdateInfo | null
  activity: 'requesting' | 'idle'
}
