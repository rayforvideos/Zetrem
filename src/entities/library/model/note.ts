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

// The answer to filing an answer. The same words filed twice are one note, so
// the second filing opens the first rather than making a copy of it; `already`
// is how the screen knows which of the two happened and what to offer for it.
export type LibraryFiling = {
  note: LibraryNote
  already: boolean
}

export type LibraryFolder = {
  name: string
}

export type LibraryListing = {
  folders: LibraryFolder[]
  notes: LibraryNoteSummary[]
}
