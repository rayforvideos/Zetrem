import type { ModelChoice } from '../run-config/run-config.types'

const NAMED: Record<string, ModelChoice> = {
  fable: 'fable',
  opus: 'opus',
  sonnet: 'sonnet',
  haiku: 'haiku',
}

// The CLI turns a 404 into one of two sentences: it names the model in
// parentheses, or it says the deployment does not carry it. Read both, and read
// them off what the CLI wrote — once we have rewritten it for the screen, the
// model's name is gone.
const NAMED_IN = [
  /selected model \(([^)]+)\)/i,
  /\bmodel\s+(\S+)\s+is not available on your\b/i,
]

export function modelRefusedIn(said: string): ModelChoice | null {
  const named = NAMED_IN.map((one) => one.exec(said)?.[1])
    .find((found) => found !== undefined)
    ?.toLowerCase()
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
