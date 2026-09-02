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
}
