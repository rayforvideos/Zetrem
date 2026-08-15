import type { ModelChoice } from '../run-config/run-config.types'

const NAMED: Record<string, ModelChoice> = {
  fable: 'fable',
  opus: 'opus',
  sonnet: 'sonnet',
  haiku: 'haiku',
}

export function modelRefusedIn(said: string): ModelChoice | null {
  const named = /selected model \(([^)]+)\)/i.exec(said)?.[1]?.toLowerCase()
  if (named === undefined) return null
  for (const [word, choice] of Object.entries(NAMED)) {
    if (named.includes(word)) return choice
  }
  return null
}

export function withRefused(held: ModelChoice[], model: ModelChoice): ModelChoice[] {
  return held.includes(model) ? held : [...held, model]
}

export function withoutRefused(held: ModelChoice[], model: ModelChoice): ModelChoice[] {
  return held.filter((one) => one !== model)
}

export function modelsWith(
  models: { id: ModelChoice; label: string; hint: string }[],
  refused: ModelChoice[],
): { id: ModelChoice; label: string; hint: string }[] {
  if (refused.length === 0) return models
  return models.map((model) =>
    refused.includes(model.id)
      ? { ...model, hint: 'Your account turned this one down. Try it again if your plan changed.' }
      : model,
  )
}
