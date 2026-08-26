import type { ModelChoice } from './model-choice.types'

// 'default' is the absence of a choice: the CLI is left to pick, and never
// names it back. Only these four ever appear in what it writes.
export const NAMED_MODELS: ModelChoice[] = ['fable', 'opus', 'sonnet', 'haiku']

export function isNamedModel(value: string): value is ModelChoice {
  return (NAMED_MODELS as string[]).includes(value)
}
