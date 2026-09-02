import type { AgentEventRefs, AgentStores } from '../agent-events.types'
import type { ModelChoice, RateLimit } from '@/entities/claude-cli'

export function freshRefs(
  stores: AgentStores,
  hooks: { onModelRefused(model: ModelChoice): void; onLimit(limit: RateLimit): void },
): AgentEventRefs {
  return {
    stores,
    asks: [],
    childIds: new Set(),
    sends: new Map(),
    limits: new Map(),
    ownedBash: new Map(),
    pendingTasks: new Map(),
    onModelRefused: hooks.onModelRefused,
    onLimit: hooks.onLimit,
  }
}
