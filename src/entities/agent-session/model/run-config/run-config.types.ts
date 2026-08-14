import type { Person, RosterLock } from '../roster-lock/roster-lock.types'

export type PermissionMode = 'ask' | 'acceptEdits' | 'bypass'

export type ModelChoice = 'default' | 'fable' | 'opus' | 'sonnet' | 'haiku'

export type RunConfig = {
  permissionMode: PermissionMode
  model: ModelChoice
  persona: string
  orchestrator?: string
  people: Person[]
  lock: RosterLock | null
}
