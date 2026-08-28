import type { ModelChoice } from '../../model/model-choice/model-choice.types'
import type { EffortChoice } from '../../model/effort-choice/effort-choice.types'
import type { Person, RosterLock } from '@/entities/claude-cli/api/roster-lock/roster-lock.types'

export type PermissionMode = 'ask' | 'acceptEdits' | 'bypass'

export type { EffortChoice, ModelChoice }

export type RunConfig = {
  permissionMode: PermissionMode
  model: ModelChoice
  effort: EffortChoice
  persona: string
  orchestrator?: string
  resume?: string | null
  people: Person[]
  lock: RosterLock | null
}
