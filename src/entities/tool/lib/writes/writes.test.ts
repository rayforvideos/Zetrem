import { describe, expect, it } from 'vitest'
import { writes } from './writes'

describe('writes: can this pick of tools change the working tree', () => {
  it('counts an empty pick as writing, since it inherits every tool the session has', () => {
    expect(writes([])).toBe(true)
  })

  it('counts Edit, Write, MultiEdit, NotebookEdit and Bash as writing', () => {
    for (const tool of ['Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'Bash']) {
      expect(writes([tool]), tool).toBe(true)
    }
  })

  it('does not count a read-only pick as writing', () => {
    expect(writes(['Read', 'Grep', 'Glob'])).toBe(false)
  })

  it('counts a pick as writing when even one tool in it can change the tree', () => {
    expect(writes(['Read', 'Bash'])).toBe(true)
  })
})
