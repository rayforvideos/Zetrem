export type RunSettled<T> = {
  bin: string
  args: string[]
  cwd?: string
  env?: NodeJS.ProcessEnv
  mergeStderr?: boolean
  // A probe that has what it came for still leaves a live CLI behind, so the
  // tree is killed on every settle, not only the timeout.
  killOnSettle?: boolean
  timeout: { ms: number; answers: (text: string) => T }
  cap?: { bytes: number; answers: (text: string) => T }
  line?: (line: string) => T | undefined
  exit: (code: number | null, text: string) => T
  error: (cause: Error) => T
  // What the caller hands back when an account operation began before the spawn
  // could happen. Asked for rather than assumed: every caller already has a way
  // of saying it learned nothing, and only the caller knows what that is.
  refused: () => T
  spawned?: (pid: number) => void
  // Told when the process has closed, which may be long after the answer.
  settled?: (pid: number) => void
}
