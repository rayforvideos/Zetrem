import type { ModelChoice, PermissionMode } from '../run-config/run-config.types'

export type Settings = {
  permissionMode: PermissionMode
  model: ModelChoice
  setupDone: boolean
  onlyOurAgents: boolean
  knownTools: string[]
  knownAgents: string[]
  stockAgents: string[]
  sidebarOpen: boolean
  sidebarWidth: number
}
