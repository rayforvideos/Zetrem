import type { Settings } from './settings.types'

import { GIT_COLUMNS, SIDEBAR } from '@/shared/config/theme'
// Not the barrel: the main process reads settings, and the barrel pulls UserFace's PNG art.
import { isFaceId, tidyUserName } from '@/entities/user/@x/settings'
import { NAMED_EFFORTS } from '@/entities/claude-cli/@x/settings'
import type { EffortChoice, ModelChoice, PermissionMode } from '@/entities/claude-cli/@x/settings'

const EFFORT_IDS: EffortChoice[] = ['default', ...NAMED_EFFORTS]

const TONGUES: Settings['tongue'][] = ['system', 'en', 'ko']

const THEMES: Settings['theme'][] = ['system', 'dark', 'light']

export const DEFAULT_SETTINGS: Settings = {
  permissionMode: 'ask',
  model: 'default',
  effort: 'default',
  refusedModels: [],
  userName: '',
  userFace: 'onigiri',
  setupDone: false,
  onboarded: false,
  hintsSeen: [],
  knownTools: [],
  tongue: 'system',
  enterSends: true,
  theme: 'dark',
  notify: true,
  knownAgents: [],
  stockOff: [],
  wasStockOn: null,
  sidebarOpen: true,
  sidebarWidth: SIDEBAR.width,
  gitColumns: gitColumns(null),
  starAskedAtMs: null,
  starred: false,
}

const MODE_IDS: PermissionMode[] = ['plan', 'ask', 'acceptEdits', 'bypass']
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

function gitColumn(name: keyof typeof GIT_COLUMNS, saved: unknown): number {
  const bounds = GIT_COLUMNS[name]
  if (typeof saved !== 'number' || !Number.isFinite(saved)) return bounds.width
  return Math.min(bounds.max, Math.max(bounds.min, Math.round(saved)))
}

// Each column is read on its own, so a file that predates one of them, or that has
// had a single width spoiled, still opens with the rest of the table as it was left.
function gitColumns(saved: unknown): Settings['gitColumns'] {
  const source =
    typeof saved === 'object' && saved !== null ? (saved as Record<string, unknown>) : {}
  return {
    refs: gitColumn('refs', source.refs),
    changes: gitColumn('changes', source.changes),
    author: gitColumn('author', source.author),
    sha: gitColumn('sha', source.sha),
    when: gitColumn('when', source.when),
  }
}

export function readSettings(saved: unknown): Settings {
  if (typeof saved !== 'object' || saved === null) return DEFAULT_SETTINGS
  const source = saved as Record<string, unknown>
  return {
    permissionMode: oneOf(MODE_IDS, source.permissionMode, DEFAULT_SETTINGS.permissionMode),
    model: oneOf(MODEL_IDS, source.model, DEFAULT_SETTINGS.model),
    effort: oneOf(EFFORT_IDS, source.effort, DEFAULT_SETTINGS.effort),
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
    stockOff: names(source.stockOff, DEFAULT_SETTINGS.stockOff),
    // Read from the marker as well as the legacy key: every write re-reads settings first, so a
    // save landing before the screen inverts the switches would write the old list away for good.
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
    gitColumns: gitColumns(source.gitColumns),
    starAskedAtMs:
      typeof source.starAskedAtMs === 'number' && Number.isFinite(source.starAskedAtMs)
        ? source.starAskedAtMs
        : null,
    starred: source.starred === true,
  }
}
