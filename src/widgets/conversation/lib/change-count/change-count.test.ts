import { describe, expect, it } from 'vitest'
import type { ToolActivity } from '@/entities/conversation'
import { changeCount } from './change-count'

function tool(line: string, input: unknown): ToolActivity {
  return { line, toolUseId: 't', input, result: null, startedAtMs: 0, endedAtMs: 100 }
}

describe('how much changed, without opening anything', () => {
  it('counts lines added and removed for an edit', () => {
    const count = changeCount(tool('Edit a.ts', { old_string: 'a\nb', new_string: 'a\nc\nd' }))
    expect(count).toEqual({ added: 2, removed: 1 })
  })

  it('counts a write as all additions, with nothing removed', () => {
    expect(changeCount(tool('Write a.ts', { content: 'x\ny\nz' }))).toEqual({ added: 3, removed: 0 })
  })

  it('adds the pieces of a multi-edit together', () => {
    const count = changeCount(
      tool('MultiEdit a.ts', {
        edits: [
          { old_string: 'a', new_string: 'b' },
          { old_string: 'c\nd', new_string: 'c' },
        ],
      }),
    )
    expect(count).toEqual({ added: 1, removed: 2 })
  })

  it('counts nothing when nothing changed, because a zero would be a lie', () => {
    expect(changeCount(tool('Edit a.ts', { old_string: 'same', new_string: 'same' }))).toBeNull()
    expect(changeCount(tool('Write a.ts', { content: '' }))).toBeNull()
  })

  it('counts nothing for input of the wrong shape', () => {
    expect(changeCount(tool('Bash ls', { command: 'ls' }))).toBeNull()
    expect(changeCount(tool('Edit a.ts', null))).toBeNull()
  })
})
