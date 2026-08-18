// The main process does not write sentences. It says what happened; the screen says it in words.
export type ExitReason = {
  code: 'cli-missing' | 'start-failed' | 'cli-said'
  said: string
}
