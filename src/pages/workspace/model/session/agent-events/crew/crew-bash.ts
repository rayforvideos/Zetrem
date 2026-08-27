import { sessionStore } from '@/entities/agent-session'
import { wake } from './wake'

// Task id → the session that backgrounded the shell. While one runs its owner
// is waiting on it, not finished.
const ownedBash = new Map<string, string>()

export function adoptChildBash(taskId: string, toolUseId: string | null): boolean {
  if (toolUseId === null) return false
  const owner = sessionStore.get().find((s) => s.stream.some((call) => call.id === toolUseId))
  if (owner === undefined) return false
  ownedBash.set(taskId, owner.id)
  wake(owner.id)
  return true
}

export function releaseChildBash(taskId: string): void {
  ownedBash.delete(taskId)
}

export function ownsRunningBash(id: string): boolean {
  for (const owner of ownedBash.values()) if (owner === id) return true
  return false
}

export function forgetOwnedBash(): void {
  ownedBash.clear()
}
