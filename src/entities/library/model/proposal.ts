// A note an agent has asked to add. Nothing is in the library until the person
// accepts it, so a proposal has no id a reader could open and no `source`: it
// is the agent's ask, not the library's answer.
export type LibraryProposal = {
  id: string
  // '' when the proposal names no folder.
  folder: string
  title: string
  body: string
  tags: string[]
  proposedAtMs: number
  // The agent host that proposed it, '' for one raised before this column
  // existed, or by a caller that never had a session to give (a probe).
  session: string
  // A teammate's name, as they gave it in the ask — '' when nobody said.
  by: string
}
