// The one sleep an account operation needs, kept apart from the operation
// itself: the code that waits for the CLI to finish writing takes its wait
// from the deps, so a test drives it and never really sleeps.
export function waitMs(ms: number): Promise<void> {
  return new Promise<void>((wake) => {
    setTimeout(wake, ms).unref()
  })
}
