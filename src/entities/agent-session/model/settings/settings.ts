import type { Settings } from './settings.types'

import { SIDEBAR } from '@/shared/config/theme'
// Not the barrel: the main process reads settings, and the barrel pulls UserFace's PNG art.
import { isFaceId, tidyUserName } from '@/entities/user/lib/face/face'
import type { ModelChoice, PermissionMode } from '../run-config/run-config.types'

const TONGUES: Settings['tongue'][] = ['system', 'en', 'ko']

const THEMES: Settings['theme'][] = ['system', 'dark', 'light']

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
  // Enter sends, as in every chat the person came from; the setting keeps
  // the modifier-only send for the hands that want it.
  enterSends: true,
  // Dark is the shipped default because the agent sprites are drawn for dark
  // ground; the light palette and wiring stay in place for when light returns.
  theme: 'dark',
  notify: true,
  knownAgents: [],
  stockOff: [],
  wasStockOn: null,
  sidebarOpen: true,
  sidebarWidth: SIDEBAR.width,
}

const MODE_IDS: PermissionMode[] = ['ask', 'acceptEdits', 'bypass']
const MODEL_IDS: ModelChoice[] = ['default', 'fable', 'opus', 'sonnet', 'haiku']

function oneOf<T extends string>(known: readonly T[], saved: unknown, fallback: T): T {
  return known.find((one) => one === saved) ?? fallback
}

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
    permissionMode: oneOf(MODE_IDS, source.permissionMode, DEFAULT_SETTINGS.permissionMode),
    model: oneOf(MODEL_IDS, source.model, DEFAULT_SETTINGS.model),
    refusedModels: names(source.refusedModels, []).filter((one): one is ModelChoice =>
      MODEL_IDS.some((id) => id === one),
    ),
    userName: tidyUserName(typeof source.userName === 'string' ? source.userName : ''),
    userFace: isFaceId(source.userFace) ? source.userFace : DEFAULT_SETTINGS.userFace,
    setupDone: source.setupDone === true,
    onboarded: source.onboarded === true,
    hintsSeen: names(source.hintsSeen, DEFAULT_SETTINGS.hintsSeen),
    knownTools: names(source.knownTools, DEFAULT_SETTINGS.knownTools),
    knownAgents: names(source.knownAgents, DEFAULT_SETTINGS.knownAgents),
    // A file written before the switches were inverted holds the ones that
    // were ON. Anything of theirs it does not name was off, and only the
    // screen knows the full set — so the migration happens there, once.
    stockOff: names(source.stockOff, DEFAULT_SETTINGS.stockOff),
    // Read back from the marker as well as from the legacy key: every write
    // re-reads the settings first, so a save landing before the screen inverts
    // the switches would otherwise write the old list away for good.
    wasStockOn: Array.isArray(source.wasStockOn)
      ? names(source.wasStockOn, [])
      : Array.isArray(source.stockAgents)
        ? names(source.stockAgents, [])
        : null,
    tongue: oneOf(TONGUES, source.tongue, 'system'),
    theme: oneOf(THEMES, source.theme, DEFAULT_SETTINGS.theme),
    notify: source.notify !== false,
    enterSends: source.enterSends !== false,
    sidebarOpen: source.sidebarOpen !== false,
    sidebarWidth: sidebarWidth(source.sidebarWidth),
  }
}
