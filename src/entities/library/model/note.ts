export type LibraryNoteSummary = {
  // The path under the library root: 'foo.md', or 'folder/foo.md'.
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

export type LibraryFolder = {
  name: string
}

export type LibraryListing = {
  folders: LibraryFolder[]
  notes: LibraryNoteSummary[]
}
