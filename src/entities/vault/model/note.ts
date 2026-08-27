export type NoteSource = 'agent' | 'person'

export type VaultNoteSummary = {
  // The path under the vault root: 'foo.md', or 'folder/foo.md'.
  id: string
  // '' when the note sits at the root.
  folder: string
  title: string
  summary: string
  source: NoteSource
  tags: string[]
  createdAtMs: number
  updatedAtMs: number
}

export type VaultNote = VaultNoteSummary & {
  body: string
  session: string | null
}

export type VaultHit = VaultNoteSummary & { snippet: string }

export type VaultFolder = {
  name: string
}

export type VaultListing = {
  folders: VaultFolder[]
  notes: VaultNoteSummary[]
}
