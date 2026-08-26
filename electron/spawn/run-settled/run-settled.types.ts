export type RunSettled<T> = {
  bin: string
  args: string[]
  cwd?: string
  env?: NodeJS.ProcessEnv
  // Folds stderr into the same text stdout writes into.
  mergeStderr?: boolean
  // A probe that has what it came for still leaves a live CLI behind, so it kills
  // the tree on the way out of every settle, not only the timeout.
  killOnSettle?: boolean
  timeout: { ms: number; answers: (text: string) => T }
  // Read as a byte cap on what has piled up: the whole output, or the unfinished
  // line when `line` is reading.
  cap?: { bytes: number; answers: (text: string) => T }
  // The first line this answers for settles the run.
  line?: (line: string) => T | undefined
  exit: (code: number | null, text: string) => T
  error: (cause: Error) => T
  spawned?: (pid: number) => void
  settled?: (pid: number) => void
}
