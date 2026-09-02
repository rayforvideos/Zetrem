// What an agent hands over when it suggests a note. The same shape its tool
// takes, minus anything the library decides for itself.
export type ProposalInput = { title: string; body: string; tags?: string[]; folder?: string }
