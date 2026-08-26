import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'
import type { ModelChoice, PermissionMode } from '../run-config/run-config.types'
import type { Said } from '@/shared/lib/say/read.types'

export const PERMISSION_MODES: {
  id: PermissionMode
  label: MessageDescriptor
  hint: MessageDescriptor
}[] = [
  { id: 'ask', label: msg`Ask first`, hint: msg`Asks before editing files or running commands` },
  {
    id: 'acceptEdits',
    label: msg`Auto-edit`,
    hint: msg`Edits files freely, asks before running commands`,
  },
  { id: 'bypass', label: msg`Allow all`, hint: msg`Never asks. Anything can run` },
]

// Model names are proper nouns. They read the same in every language.
export const MODELS: { id: ModelChoice; label: Said; hint: MessageDescriptor }[] = [
  { id: 'default', label: msg`Default`, hint: msg`Follows your account setting` },
  {
    id: 'fable',
    label: 'Fable',
    hint: msg`The hardest problems. Slowest and priciest of these`,
  },
  { id: 'opus', label: 'Opus', hint: msg`Complex work. Slower and pricier` },
  { id: 'sonnet', label: 'Sonnet', hint: msg`Balanced for most tasks` },
  { id: 'haiku', label: 'Haiku', hint: msg`Fast and cheap. Good for quick questions` },
]

export function modelsWith(
  models: { id: ModelChoice; label: Said; hint: Said }[],
  refused: ModelChoice[],
): { id: ModelChoice; label: Said; hint: Said }[] {
  if (refused.length === 0) return models
  return models.map((model) =>
    refused.includes(model.id)
      ? {
          ...model,
          hint: msg`Your account turned this one down. Try it again if your plan changed.`,
        }
      : model,
  )
}
