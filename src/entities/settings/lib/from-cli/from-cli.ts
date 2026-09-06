import { i18n } from '@lingui/core'
import type { PermissionMode } from '@/entities/claude-cli/@x/settings'
import { modelFamily } from '@/shared/lib/model-label/model-label'
import { PERMISSION_MODES } from '../../config/choices/choices'

// The CLI reports back in its own vocabulary: the mode it was given as
// --dangerously-skip-permissions returns as bypassPermissions, and the model as
// the dated id the account resolved to. The app already has a word for each of
// those, and a session detail is no place to start speaking the CLI's.
const MODES: Record<string, PermissionMode> = {
  default: 'ask',
  ask: 'ask',
  plan: 'plan',
  acceptEdits: 'acceptEdits',
  bypass: 'bypass',
  bypassPermissions: 'bypass',
}

export function modeFromCli(mode: string): string | null {
  const id = MODES[mode.trim()]
  if (id === undefined) return null
  const found = PERMISSION_MODES.find((one) => one.id === id)
  return found === undefined ? null : i18n._(found.label)
}

export function modelFromCli(model: string): string | null {
  return modelFamily(model)
}
