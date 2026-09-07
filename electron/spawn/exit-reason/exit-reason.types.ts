// Everything known about a session process the moment it ended, which is what
// it takes to tell a death from a stop the app itself asked for.
export type Ending = {
  code: number | null
  signal: string | null
  stderr: string
  spawnError: string
  // Zetrem asked for this end: a stop, a restart, an account change, a window
  // that went away. The person already knows, so the pane says nothing.
  asked: boolean
}
