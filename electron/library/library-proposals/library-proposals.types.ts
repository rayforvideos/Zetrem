// What an agent hands over when it suggests a note. The same shape its tool
// takes, minus anything the library decides for itself, plus what the MCP
// layer already worked out on its own: the session the call arrived on, and
// the name it was proposed under.
export type ProposalInput = {
  title: string
  body: string
  tags?: string[]
  folder?: string
  session: string
  by: string
}
