import type { ModelChoice } from '../../model/model-choice/model-choice.types'
import type { EffortChoice } from '../../model/effort-choice/effort-choice.types'
import type { Person, RosterLock } from '@/entities/claude-cli/api/roster-lock/roster-lock.types'

export type PermissionMode = 'plan' | 'ask' | 'acceptEdits' | 'bypass'

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
  isolated?: boolean
  // A line naming the language the app is read in, ended onto every teammate's brief.
  spoken?: string
  // Whether the session may reach into the person's browser through the Claude in
  // Chrome extension. Unsaid is off, which is what the CLI does on its own.
  chrome?: boolean
}
