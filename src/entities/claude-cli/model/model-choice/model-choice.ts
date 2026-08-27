import type { ModelChoice } from './model-choice.types'

// 'default' is the absence of a choice: the CLI picks, and never names 'default' back.
export const NAMED_MODELS: ModelChoice[] = ['fable', 'opus', 'sonnet', 'haiku']
