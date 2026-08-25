import { createHash } from 'node:crypto'

// The folder a project's chats live under. Kept here rather than inside the
// store because anything that moves chats between projects — a migration, for
// one — has to name the same folder the store reads.
export function transcriptKey(project: string): string {
  return createHash('sha256').update(project).digest('hex').slice(0, 32)
}
