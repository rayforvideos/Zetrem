import type { Settings } from './settings.types'

import { SIDEBAR } from '@/shared/config/theme'
import { isFaceId, tidyUserName } from '@/entities/user'
import type { ModelChoice, PermissionMode } from '../run-config/run-config.types'

const TONGUES = ['system', 'en', 'ko']

const THEMES = ['system', 'dark', 'light']

export const DEFAULT_SETTINGS: Settings = {
  permissionMode: 'ask',
  model: 'default',
  refusedModels: [],
  userName: '',
  userFace: 'onigiri',
  setupDone: false,
  onboarded: false,
  hintsSeen: [],
  knownTools: [],
  tongue: 'system',
  // Dark is the shipped default because the agent sprites are drawn for dark
  // ground; the light palette and wiring stay in place for when light returns.
  theme: 'dark',
  notify: true,
  knownAgents: [],
  stockAgents: [],
  sidebarOpen: true,
  sidebarWidth: SIDEBAR.width,
}

const MODE_IDS: PermissionMode[] = ['ask', 'acceptEdits', 'bypass']
const MODEL_IDS: ModelChoice[] = ['default', 'fable', 'opus', 'sonnet', 'haiku']

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
    refusedModels: names(source.refusedModels, []).filter((one): one is ModelChoice =>
      MODEL_IDS.includes(one as ModelChoice),
    ),
    userName: tidyUserName(typeof source.userName === 'string' ? source.userName : ''),
    userFace: isFaceId(source.userFace) ? source.userFace : DEFAULT_SETTINGS.userFace,
    setupDone: source.setupDone === true,
    onboarded: source.onboarded === true,
    hintsSeen: names(source.hintsSeen, DEFAULT_SETTINGS.hintsSeen),
    knownTools: names(source.knownTools, DEFAULT_SETTINGS.knownTools),
    knownAgents: names(source.knownAgents, DEFAULT_SETTINGS.knownAgents),
    stockAgents: names(source.stockAgents, DEFAULT_SETTINGS.stockAgents),
    tongue: TONGUES.includes(source.tongue as string) ? (source.tongue as Settings['tongue']) : 'system',
    theme: THEMES.includes(source.theme as string)
      ? (source.theme as Settings['theme'])
      : DEFAULT_SETTINGS.theme,
    notify: source.notify !== false,
    sidebarOpen: source.sidebarOpen !== false,
    sidebarWidth: sidebarWidth(source.sidebarWidth),
  }
}
