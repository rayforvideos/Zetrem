import { createHash } from 'node:crypto'

export function transcriptKey(project: string): string {
  return createHash('sha256').update(project).digest('hex').slice(0, 32)
}
