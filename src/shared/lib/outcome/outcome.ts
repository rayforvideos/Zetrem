// Where a failure is shown depends on what it stops, not on where it came from:
//
//   one action did not work (install, sign in, save)   → useAsk: a toast line
//   the session needs to remember it (exit, limit)     → conversation.system()
//   this screen cannot stand (project, settings)       → useFailure: the panel
//   the app cannot stand (crash, load failure)         → Boundary / trouble page
//
// A handler answers with an Outcome rather than throwing. A throw is reserved
// for a request that should never have been made (an untrusted sender, a path
// outside its folder); tests/conventions/outcomes.test.ts keeps that list.
import type { Outcome, Why, WhyCode } from './outcome.types'

export function won<T>(value: T): Outcome<T> {
  return { ok: true, value }
}

export function lost<T = never>(code: WhyCode, said = ''): Outcome<T> {
  return { ok: false, why: { code, said } }
}

// The text either side carries: a CLI's output whether it passed or failed.
export function textOf(outcome: Outcome<string>): string {
  return outcome.ok ? outcome.value : outcome.why.said
}

export function whyOf<T>(outcome: Outcome<T>): Why | null {
  return outcome.ok ? null : outcome.why
}
