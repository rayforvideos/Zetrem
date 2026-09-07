// The last lines a session's stderr said, kept as they arrive so that the one
// log line written at its death has the words that explain it.
export type ErrorLines = {
  take(chunk: string): void
  lines(): string[]
}

// One session process, as the app log records it the moment it ends.
export type ExitNote = {
  // The chat the process was running for, or null where the renderer never
  // named one: a log that guesses is worse than one that says it does not know.
  chat: string | null
  host: string
  upMs: number
  // 'exit 3' or 'SIGKILL': the same word the pane shows, made by endedWith.
  ended: string
  // Whether Zetrem asked for this end: a stop, a restart, an account change.
  asked: boolean
  stderr: string[]
}
