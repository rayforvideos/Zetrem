// On disk: the head of every note in a library, read back by later versions.
export type NoteMeta = {
  title: string
  created: string
  updated: string
  tags: string[]
  // Who left the note: 'agent' when a session wrote it through its tool, '' when
  // a person did, or the file predates this key.
  source: string
  // Keys this version does not know, written back as they were read.
  rest: Record<string, string>
}

export type ParsedNote = {
  meta: NoteMeta | null
  body: string
}
