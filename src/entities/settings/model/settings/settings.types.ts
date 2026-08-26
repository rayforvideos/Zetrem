import type { FaceId } from '@/entities/user/@x/settings'
import type { ModelChoice, PermissionMode } from '@/entities/claude-cli/@x/settings'

// On disk: settings.json under userData, read by readSettings(). A change here
// is a change to a file people already have; readSettings() must still read the
// old shape and fill what is missing.
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
  // Which of Claude Code's own agents were switched OFF. Being one of theirs is
  // enough to be on, so nothing has to be written down to enable one — and
  // nothing can enable one behind your back.
  stockOff: string[]
  // What a file written before the switches were inverted said was ON. Null
  // once the migration has run. Only the screen knows the full set of theirs,
  // so that is where an old file is turned into a list of off switches.
  wasStockOn: string[] | null
  tongue: 'system' | 'en' | 'ko'
  enterSends: boolean
  theme: 'system' | 'dark' | 'light'
  notify: boolean
  sidebarOpen: boolean
  sidebarWidth: number
}
