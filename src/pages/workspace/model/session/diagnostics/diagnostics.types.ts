// The teammate a paste is about, when it is about one rather than the whole
// chat. The task id is kept because half the crew events name a teammate by
// its task rather than by the tool call it opened under.
export type DiagnosticsAbout = {
  seat: string
  label: string
  taskId: string | null
}

// What the first lines of a paste say before the log itself starts.
export type DiagnosticsHead = {
  chat: string | null
  about: DiagnosticsAbout | null
}
