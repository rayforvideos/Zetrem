// `said` is raw evidence (CLI output, a validation code), never a sentence for
// the screen; the screen turns code and evidence into words where it shows them.
export type WhyCode =
  | 'refused'
  | 'garbled'
  | 'unsupported'
  | 'cli'
  | 'timeout'
  | 'failed'
  // The account on this machine is being moved, so nothing new may run yet.
  | 'busy'

export type Why = { code: WhyCode; said: string }

export type Outcome<T> = { ok: true; value: T } | { ok: false; why: Why }
