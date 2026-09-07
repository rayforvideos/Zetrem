import type { ModelChoice } from './model-choice.types'

// 'default' is the absence of a choice: the CLI picks, and never names 'default' back.
export const NAMED_MODELS: ModelChoice[] = ['fable', 'opus', 'sonnet', 'haiku']

// Which of the named models a running session is on. The CLI reports the full
// id it resolved to, dated build and all (claude-haiku-4-5-20251001), and the
// app only ever holds the family. An id from outside this list is reported as
// unknown rather than guessed at: a wrong answer here would have the composer
// contradict a session that is doing nothing wrong.
export function modelFromCli(said: string): ModelChoice | null {
  const lower = said.toLocaleLowerCase()
  return NAMED_MODELS.find((name) => lower.includes(name)) ?? null
}
