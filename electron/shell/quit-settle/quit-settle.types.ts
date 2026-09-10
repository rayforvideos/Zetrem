export type QuitSettleDeps = {
  // The work a quit waits on. Resolved or rejected, the quit goes on after it.
  settle(): Promise<unknown>
  // How long the quit is held for it, in milliseconds.
  deadlineMs: number
  // Ran when the deadline passed with the settle still pending.
  late(): void
  // Ran once, when either has happened: the quit may now go through.
  quit(): void
}

export type QuitSettle = {
  // Answers a before-quit. True when the quit must be held back, false when
  // the settle is behind it and the quit may go through.
  hold(): boolean
}
