import type { AgentSession } from '@/entities/agent-session'

export const SETTLE_QUIET_MS = 6000

export function settled(children: AgentSession[], nowMs: number, quietMs: number): string[] {
  return children
    .filter((session) => session.status === 'reported')
    .filter((session) => nowMs - (session.lastSeenAtMs ?? session.startedAtMs) >= quietMs)
    .map((session) => session.id)
}
