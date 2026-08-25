// Why something did not happen. The code says what kind of failure it was;
// `said` is the evidence, raw: a CLI's last words, a validation code, an error
// message. Never a sentence for the screen. Main does not write those, and the
// screen turns code and evidence into words where it shows them.
export type WhyCode =
  // The request itself was turned down before anything ran: bad input, a name
  // that cannot be used. `said` may carry a finer code the screen knows.
  | 'refused'
  // A request main could not read at all.
  | 'garbled'
  // A verb or action nothing here knows.
  | 'unsupported'
  // The CLI ran and ended badly. `said` is its output.
  | 'cli'
  // Something ran out of time and was stopped. `said` is what it had said.
  | 'timeout'
  // It could not even start: a missing binary, a spawn error.
  | 'failed'

export type Why = { code: WhyCode; said: string }

// The one shape for "this either worked or here is why not". Used wherever a
// result crosses a boundary: an IPC reply, a CLI run, a store write the caller
// needs to hear about.
export type Outcome<T> = { ok: true; value: T } | { ok: false; why: Why }
