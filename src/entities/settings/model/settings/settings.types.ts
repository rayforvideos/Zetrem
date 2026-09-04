import type { GIT_COLUMNS } from '@/shared/config/theme'
import type { FaceId } from '@/entities/user/@x/settings'
import type { EffortChoice, ModelChoice, PermissionMode } from '@/entities/claude-cli/@x/settings'

// On disk: settings.json under userData. readSettings() must still read the old shape.
// and fill what is missing.
export type Settings = {
  permissionMode: PermissionMode
  model: ModelChoice
  effort: EffortChoice
  refusedModels: ModelChoice[]
  userName: string
  userFace: FaceId
  setupDone: boolean
  onboarded: boolean
  hintsSeen: string[]
  knownTools: string[]
  knownAgents: string[]
  // Which of Claude Code's own agents were switched OFF; being one of theirs is enough to be on.
  stockOff: string[]
  // What a pre-inversion file said was ON. Null once the migration has run, which happens in
  // the screen because only it knows the full set of theirs.
  wasStockOn: string[] | null
  tongue: 'system' | 'en' | 'ko'
  enterSends: boolean
  theme: 'system' | 'dark' | 'light'
  notify: boolean
  // Whether a session may drive the person's browser through the Claude in Chrome
  // extension. Off unless asked for, so no run reaches the browser by surprise.
  chrome: boolean
  sidebarOpen: boolean
  sidebarWidth: number
  // How wide each draggable column of the git history was left, in px, keyed by
  // column name. A width nobody has dragged is the default GIT_COLUMNS carries.
  gitColumns: Record<keyof typeof GIT_COLUMNS, number>
  // The GitHub star ask: when it was last shown (null: never), and whether it was taken up.
  starAskedAtMs: number | null
  starred: boolean
}
