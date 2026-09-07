// One decision the crew rules took about a teammate tile, as it was taken.
// The words are diagnostic text, not anything a person is meant to read in the
// app, so they are written in English wherever they are made.
export type CrewLogEntry = {
  atMs: number
  // What caused the decision: 'childStarted', 'childProgress', 'childNotified',
  // 'childStateKnown', 'wakeResumed', 'settle', and so on.
  event: string
  // The tool call the runtime named the task under, when it named one.
  toolUseId: string | null
  // The runtime's own id for the task, when the event carried one.
  taskId: string | null
  // The tile the decision landed on, or null when it landed on nobody.
  seat: string | null
  // What was decided: 'opened seat X', 'matched by task id', 'dropped: no
  // seat', 'held: owns shell bash-1', 'parked', 'closed', 'named by runtime'.
  decision: string
}

// What a caller hands in. The clock is read by the log itself, and an id the
// caller has nothing to say about is simply left out.
export type CrewLogNote = {
  event: string
  toolUseId?: string | null
  taskId?: string | null
  seat?: string | null
  decision: string
}

// A ring of the last few hundred decisions, kept in memory for as long as the
// chat session it belongs to. Nothing here is ever written to disk.
export type CrewLog = {
  note(one: CrewLogNote): void
  // Oldest first, so a paste reads in the order things happened.
  entries(): CrewLogEntry[]
  clear(): void
}
