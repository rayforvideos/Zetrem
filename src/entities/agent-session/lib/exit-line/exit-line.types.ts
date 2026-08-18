export type ExitReason = {
  code: 'cli-missing' | 'start-failed' | 'cli-said'
  said: string
}
