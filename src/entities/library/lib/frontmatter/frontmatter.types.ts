// On disk: the head of a note in a library an earlier version kept as markdown
// files inside the project. Nothing writes these files any more; they are read
// once, when such a library is taken into the app.
export type NoteMeta = {
  title: string
  created: string
  updated: string
  tags: string[]
  // Who left the note: 'agent' when a session wrote it through its tool, '' when
  // a person did, or the file predates this key.
  source: string
}

export type ParsedNote = {
  meta: NoteMeta | null
  body: string
}
