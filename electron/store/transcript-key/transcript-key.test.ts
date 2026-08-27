import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { transcriptKey } from './transcript-key'

describe('the folder name a project keeps its chats under', () => {
  // The store has always hashed the project string this way. Anything that
  // moves chats between projects has to agree with it exactly.
  it('is the first half of the sha256 of the project string', () => {
    const project = '/Users/sam/work/shop'
    const want = createHash('sha256').update(project).digest('hex').slice(0, 32)
    expect(transcriptKey(project)).toBe(want)
  })

  it('gives two projects two different folders', () => {
    expect(transcriptKey('/a')).not.toBe(transcriptKey('/b'))
  })
})
