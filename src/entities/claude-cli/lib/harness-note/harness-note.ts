// When a subagent's report trips the CLI's output guard, the CLI puts one
// bracketed note in front of the report before handing it up, in both the
// task notification's summary and the Agent tool result. The note is written
// for the model reading the report, not for a person, and the app has no word
// for it. Only this one exact shape is cut, and only at the very front: any
// bracket a teammate wrote itself stays where it was.
const NOTE = /^\s*\[harness: subagent output matched instruction-shaped pattern\(s\): [^\]\n]*\]\s*/

export function withoutHarnessNote(said: string): string {
  return said.replace(NOTE, '')
}
