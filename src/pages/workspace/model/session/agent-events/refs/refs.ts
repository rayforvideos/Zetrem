import type { AgentEventRefs, AgentStores } from '../agent-events.types'
import type { ModelChoice, RateLimit } from '@/entities/claude-cli'
import { createCrewLog } from '../crew-log/crew-log'

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
    heldReports: new Set(),
    crewLog: createCrewLog(),
    onModelRefused: hooks.onModelRefused,
    onLimit: hooks.onLimit,
  }
}
