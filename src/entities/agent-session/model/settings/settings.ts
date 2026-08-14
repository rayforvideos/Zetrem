import type { Settings } from './settings.types'

import { MODELS, PERMISSION_MODES } from '../run-config/run-config'
import type { ModelChoice, PermissionMode } from '../run-config/run-config.types'

export const DEFAULT_SETTINGS: Settings = {
  permissionMode: 'ask',
  model: 'default',
  setupDone: false,
  onlyOurAgents: true,
  knownTools: [],
  sidebarOpen: true,
}

const MODE_IDS: PermissionMode[] = PERMISSION_MODES.map((mode) => mode.id)
const MODEL_IDS: ModelChoice[] = MODELS.map((model) => model.id)

export function readSettings(saved: unknown): Settings {
  if (typeof saved !== 'object' || saved === null) return DEFAULT_SETTINGS
  const source = saved as Record<string, unknown>
  return {
    permissionMode: MODE_IDS.includes(source.permissionMode as PermissionMode)
      ? (source.permissionMode as PermissionMode)
      : DEFAULT_SETTINGS.permissionMode,
    model: MODEL_IDS.includes(source.model as ModelChoice)
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
