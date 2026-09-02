export type LibraryNoteSummary = {
  // Names the note in its library: 'foo.md', or 'folder/foo.md'.
  id: string
  // '' when the note sits at the root.
  folder: string
  title: string
  summary: string
  tags: string[]
  // 'agent' when a session wrote the note through its tool; '' for a person.
  source: string
  createdAtMs: number
  updatedAtMs: number
}

export type LibraryNote = LibraryNoteSummary & { body: string }

export type LibraryHit = LibraryNoteSummary & { snippet: string }

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

export type LibraryFolder = {
  name: string
}

export type LibraryListing = {
  folders: LibraryFolder[]
  notes: LibraryNoteSummary[]
}
