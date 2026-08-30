import type { Settings } from '@/entities/settings'

// The saved settings hold two kinds of thing: what the person chose, and what
// the app worked out about the account they were signed in as. Only the second
// kind goes when the account moves, and only when there is something to go:
// an empty patch would cost a write for nothing.
export function forgottenOnAccountChange(settings: Settings): Partial<Settings> | null {
  const patch: Partial<Settings> = {}
  // A model is refused by the plan, not by the machine. Kept across a change,
  // it hides a model from an account whose plan allows it, with no way back.
  if (settings.refusedModels.length > 0) patch.refusedModels = []
  // These two only ever widen, since a session shows part of the tool set at a
  // time. Widening is right within one account and wrong across two: a tool or
  // an agent one plan gates would linger for a plan that never had it.
  if (settings.knownTools.length > 0) patch.knownTools = []
  if (settings.knownAgents.length > 0) patch.knownAgents = []
  return Object.keys(patch).length === 0 ? null : patch
}
