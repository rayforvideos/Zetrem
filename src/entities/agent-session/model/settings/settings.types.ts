import type { ModelChoice, PermissionMode } from '../run-config/run-config.types'

export type Settings = {
  permissionMode: PermissionMode
  model: ModelChoice
  setupDone: boolean
  onlyOurAgents: boolean
  knownTools: string[]
  sidebarOpen: boolean
}
