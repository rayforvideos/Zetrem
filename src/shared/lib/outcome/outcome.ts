// Handlers answer with an Outcome rather than throwing; throwing is reserved for
// requests that should never have been made. tests/conventions/outcomes.test.ts keeps that list.
import type { Outcome, Why, WhyCode } from './outcome.types'

export function won<T>(value: T): Outcome<T> {
  return { ok: true, value }
}

export function lost<T = never>(code: WhyCode, said = ''): Outcome<T> {
  return { ok: false, why: { code, said } }
}

export function textOf(outcome: Outcome<string>): string {
  return outcome.ok ? outcome.value : outcome.why.said
}

export function whyOf<T>(outcome: Outcome<T>): Why | null {
  return outcome.ok ? null : outcome.why
}
