import type { ModelChoice, PermissionMode } from './run-config'

export type Settings = {
  permissionMode: PermissionMode
  model: ModelChoice
  setupDone: boolean
  onlyOurAgents: boolean
  knownTools: string[]
  sidebarOpen: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  permissionMode: 'ask',
  model: 'default',
  setupDone: false,
  onlyOurAgents: true,
  knownTools: [],
  sidebarOpen: true,
}

const PERMISSION_MODES: PermissionMode[] = ['ask', 'acceptEdits', 'bypass']
const MODELS: ModelChoice[] = ['default', 'opus', 'sonnet', 'haiku']

export function readSettings(saved: unknown): Settings {
  if (typeof saved !== 'object' || saved === null) return DEFAULT_SETTINGS
  const source = saved as Record<string, unknown>
  return {
    permissionMode: PERMISSION_MODES.includes(source.permissionMode as PermissionMode)
      ? (source.permissionMode as PermissionMode)
      : DEFAULT_SETTINGS.permissionMode,
    model: MODELS.includes(source.model as ModelChoice)
      ? (source.model as ModelChoice)
      : DEFAULT_SETTINGS.model,
    setupDone: source.setupDone === true,
    onlyOurAgents: source.onlyOurAgents !== false,
    knownTools: Array.isArray(source.knownTools)
      ? (source.knownTools as unknown[]).filter((name): name is string => typeof name === 'string')
      : DEFAULT_SETTINGS.knownTools,
    sidebarOpen: source.sidebarOpen !== false,
  }
}
