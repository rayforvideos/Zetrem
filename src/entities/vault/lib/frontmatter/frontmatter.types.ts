import type { NoteSource } from '../../model/note'

// On disk: the head of every note in a vault, read back by later versions.
export type NoteMeta = {
  title: string
  created: string
  updated: string
  source: NoteSource
  session: string | null
  tags: string[]
  // Keys this version does not know, written back as they were read.
  rest: Record<string, string>
}

export type ParsedNote = {
  meta: NoteMeta | null
  body: string
}
