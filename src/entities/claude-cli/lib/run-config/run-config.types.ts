import type { ModelChoice } from '../model-choice/model-choice.types'
import type { Person, RosterLock } from '@/entities/teammate/model/roster-lock/roster-lock.types'

export type PermissionMode = 'ask' | 'acceptEdits' | 'bypass'

export type { ModelChoice }

export type RunConfig = {
  permissionMode: PermissionMode
  model: ModelChoice
  persona: string
  orchestrator?: string
  resume?: string | null
  people: Person[]
  lock: RosterLock | null
}
