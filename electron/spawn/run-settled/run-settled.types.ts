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
  spawned?: (pid: number) => void
  settled?: (pid: number) => void
}
