import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'
import type { EffortChoice, ModelChoice, PermissionMode } from '@/entities/claude-cli/@x/settings'
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

// The CLI's --effort levels: how long it thinks before it answers.
export const EFFORTS: { id: EffortChoice; label: MessageDescriptor; hint: MessageDescriptor }[] = [
  { id: 'default', label: msg`Default`, hint: msg`Follows your Claude Code setting` },
  { id: 'low', label: msg`Low`, hint: msg`Quick answers. Least thinking, cheapest` },
  { id: 'medium', label: msg`Medium`, hint: msg`Everyday work` },
  { id: 'high', label: msg`High`, hint: msg`Thinks longer. Slower and pricier` },
  { id: 'xhigh', label: msg`Very high`, hint: msg`Hard problems. Much slower` },
  { id: 'max', label: msg`Max`, hint: msg`Everything it has. Slowest and priciest` },
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
