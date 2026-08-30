// A registry of live children says when it has emptied, and a caller waits on
// that with a deadline.
export type GoneWatch = {
  note(empty: boolean): void
  within(empty: boolean, ms: number): Promise<boolean>
}
