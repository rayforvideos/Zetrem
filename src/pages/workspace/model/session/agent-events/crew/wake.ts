import type { SessionStore } from '@/entities/agent-session'

export function wake(children: SessionStore, toolUseId: string): void {
  const status = children.find(toolUseId)?.status
  if (status === undefined || status === 'working') return
  children.patch(toolUseId, { status: 'working', endedAtMs: undefined })
}

// A child the runtime starts or reports on again is back at work: whatever
// held report it had is no longer the last word about it.
export function unhold(children: SessionStore, toolUseId: string): void {
  if (children.find(toolUseId)?.heldAtMs === undefined) return
  children.patch(toolUseId, { heldAtMs: undefined })
}
