// On disk: a library is one SQLite file per project, under userData/library.
// These rows are the notes themselves and not a cache of anything, so a later
// version reads them as they were written.
export type NoteRow = {
  id: string
  folder: string
  title: string
  body: string
  // A JSON array of strings.
  tags: string
  // 'agent' when a session wrote the note through its tool, '' when a person did.
  source: string
  created_at_ms: number
  updated_at_ms: number
}

export type FolderRow = { name: string }
