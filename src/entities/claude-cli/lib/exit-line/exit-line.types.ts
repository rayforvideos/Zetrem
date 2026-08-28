export type ExitReason = {
  // 'died': the CLI ended with an exit code and no word; `said` holds the code.
  code: 'cli-missing' | 'start-failed' | 'cli-said' | 'died'
  said: string
}
