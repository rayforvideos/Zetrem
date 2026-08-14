import type { RateLimit, SessionIdentity, StatusEvent } from '../../api/claude/status/status.types'

export type HookRun = { name: string; event: string; exitCode: number; ms: number }

export type UpdateInfo = {
  current: string | null
  latest: string | null
  managedBy: string | null
}

export type StatusState = {
  session: SessionIdentity | null
  context: { used: number; window: number | null }
  cost: {
    usd: number
    lastTurnUsd: number
    tokens: { in: number; out: number; cacheRead: number; cacheCreate: number }
    durationMs: number
    ttftMs: number | null
    turns: number
  }
  limit: RateLimit | null
  hooks: HookRun[]
  update: UpdateInfo | null
  activity: 'requesting' | 'idle'
}
