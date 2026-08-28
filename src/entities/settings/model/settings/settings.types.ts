import type { FaceId } from '@/entities/user/@x/settings'
import type { ModelChoice, PermissionMode } from '@/entities/claude-cli/@x/settings'

// On disk: settings.json under userData. readSettings() must still read the old shape.
// and fill what is missing.
export type Settings = {
  permissionMode: PermissionMode
  model: ModelChoice
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
  sidebarOpen: boolean
  sidebarWidth: number
  // The GitHub star ask: when it was last shown (null: never), and whether it was taken up.
  starAskedAtMs: number | null
  starred: boolean
}
