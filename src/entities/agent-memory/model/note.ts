// One remembered fact in the agent's own memory folder: the file name keys
// it, the rest is read out of its frontmatter for the list.
export type MemoryEntry = {
  id: string
  name: string
  description: string
  kind: string
}

// A note opened for editing: the frontmatter stays behind the curtain, so
// the pane sees the description and the body and nothing else.
export type MemoryNote = {
  name: string
  description: string
  kind: string
  body: string
}
