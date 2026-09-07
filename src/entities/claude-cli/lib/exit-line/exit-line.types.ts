export type ExitReason = {
  // 'died': the CLI ended with an exit code and no word; `said` holds the code.
  // 'signalled': something outside ended it; `said` holds the signal's name.
  code: 'cli-missing' | 'start-failed' | 'cli-said' | 'died' | 'signalled'
  said: string
  // How it ended, in the word the app log uses too: 'exit 3', 'SIGKILL'. Empty
  // where nothing ever ran, which is what a start that failed leaves behind.
  ended: string
}
