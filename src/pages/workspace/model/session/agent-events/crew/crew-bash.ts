import type { AgentEventRefs } from '../agent-events.types'
import { wake } from './wake'

export function adoptChildBash(
  refs: AgentEventRefs,
  taskId: string,
  toolUseId: string | null,
): boolean {
  if (toolUseId === null) return false
  const owner = refs.stores.children
    .get()
    .find((s) => s.stream.some((call) => call.id === toolUseId))
  if (owner === undefined) return false
  refs.ownedBash.set(taskId, owner.id)
  wake(refs.stores.children, owner.id)
  return true
}

export function releaseChildBash(refs: AgentEventRefs, taskId: string): void {
  refs.ownedBash.delete(taskId)
}

export function ownsRunningBash(refs: AgentEventRefs, id: string): boolean {
  for (const owner of refs.ownedBash.values()) if (owner === id) return true
  return false
}
