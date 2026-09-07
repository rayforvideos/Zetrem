import type { AgentEventRefs } from '../agent-events.types'
import { wake } from './wake'

// Answers with the teammate that owns the shell, so the caller can say whose
// tile the adoption was for. Null when this shell is the orchestrator's own.
export function adoptChildBash(
  refs: AgentEventRefs,
  taskId: string,
  toolUseId: string | null,
): string | null {
  if (toolUseId === null) return null
  const owner = refs.stores.children
    .get()
    .find((s) => s.stream.some((call) => call.id === toolUseId))
  if (owner === undefined) return null
  refs.ownedBash.set(taskId, owner.id)
  wake(refs.stores.children, owner.id)
  return owner.id
}

export function releaseChildBash(refs: AgentEventRefs, taskId: string): void {
  refs.ownedBash.delete(taskId)
}

export function ownsRunningBash(refs: AgentEventRefs, id: string): boolean {
  for (const owner of refs.ownedBash.values()) if (owner === id) return true
  return false
}

// The shells this teammate still holds, named so a held report can say which
// one it is waiting on rather than only that it is waiting.
export function shellsOwnedBy(refs: AgentEventRefs, id: string): string[] {
  const held: string[] = []
  for (const [taskId, owner] of refs.ownedBash) if (owner === id) held.push(taskId)
  return held
}
