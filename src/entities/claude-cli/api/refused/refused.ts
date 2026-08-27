import type { ModelChoice } from '../../model/model-choice/model-choice.types'
import { NAMED_MODELS as NAMED } from '../../model/model-choice/model-choice'

// The CLI turns a 404 into one of two sentences, so both are matched. Read them off the raw CLI
// text: once it is rewritten for the screen the model's name is gone.
const NAMED_IN = [/selected model \(([^)]+)\)/i, /\bmodel\s+(\S+)\s+is not available on your\b/i]

export function modelRefusedIn(said: string): ModelChoice | null {
  const named = NAMED_IN.map((one) => one.exec(said)?.[1])
    .find((found) => found !== undefined)
    ?.toLowerCase()
  if (named === undefined) return null
  return NAMED.find((choice) => named.includes(choice)) ?? null
}

export function withRefused(held: ModelChoice[], model: ModelChoice): ModelChoice[] {
  return held.includes(model) ? held : [...held, model]
}

export function withoutRefused(held: ModelChoice[], model: ModelChoice): ModelChoice[] {
  return held.filter((one) => one !== model)
}
