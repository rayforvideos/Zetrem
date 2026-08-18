import { stockAgents } from '@/entities/agent-session'

// A session only tells us which built-in agents exist once it is already running,
// and the lock it runs under was fixed before that. So during the session that
// discovers them they are all callable, whatever the switches say. Turning a
// newly discovered one on keeps the switch honest about what is true right now;
// turning it off is the user's choice, and we never undo it.
export function learnedStock(
  seen: string[],
  known: string[],
  enabled: string[],
  ours: string[],
  authored: string[],
): string[] | null {
  const before = new Set(known)
  const fresh = stockAgents(seen, ours, authored).filter((name) => !before.has(name))
  if (fresh.length === 0) return null
  const held = new Set(enabled)
  const added = fresh.filter((name) => !held.has(name))
  return added.length === 0 ? null : [...enabled, ...added]
}
