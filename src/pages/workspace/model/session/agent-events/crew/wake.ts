import type { SessionStore } from '@/entities/agent-session'

export function wake(children: SessionStore, toolUseId: string): void {
  const status = children.find(toolUseId)?.status
  if (status === undefined || status === 'working') return
  children.patch(toolUseId, { status: 'working', endedAtMs: undefined })
}
