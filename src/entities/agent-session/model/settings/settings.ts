import type { Settings } from './settings.types'

import { SIDEBAR } from '@/shared/config/theme'
import { MODELS, PERMISSION_MODES } from '../run-config/run-config'
import type { ModelChoice, PermissionMode } from '../run-config/run-config.types'

export const DEFAULT_SETTINGS: Settings = {
  permissionMode: 'ask',
  model: 'default',
  setupDone: false,
  onlyOurAgents: true,
  knownTools: [],
  knownAgents: [],
  stockAgents: [],
  sidebarOpen: true,
  sidebarWidth: SIDEBAR.width,
}

const MODE_IDS: PermissionMode[] = PERMISSION_MODES.map((mode) => mode.id)
const MODEL_IDS: ModelChoice[] = MODELS.map((model) => model.id)

function names(saved: unknown, fallback: string[]): string[] {
  if (!Array.isArray(saved)) return fallback
  return (saved as unknown[]).filter((name): name is string => typeof name === 'string')
}

function sidebarWidth(saved: unknown): number {
  if (typeof saved !== 'number' || !Number.isFinite(saved)) return SIDEBAR.width
  return Math.min(SIDEBAR.max, Math.max(SIDEBAR.min, Math.round(saved)))
}

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
    knownTools: names(source.knownTools, DEFAULT_SETTINGS.knownTools),
    knownAgents: names(source.knownAgents, DEFAULT_SETTINGS.knownAgents),
    stockAgents: names(source.stockAgents, DEFAULT_SETTINGS.stockAgents),
    sidebarOpen: source.sidebarOpen !== false,
    sidebarWidth: sidebarWidth(source.sidebarWidth),
  }
}
