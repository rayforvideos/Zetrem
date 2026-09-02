import { describe, expect, it } from 'vitest'
import type { ToolActivity } from '@/entities/conversation/@x/tool'
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
    expect(changeCount(tool('Write a.ts', { content: 'x\ny\nz' }))).toEqual({
      added: 3,
      removed: 0,
    })
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

describe('the count matches the rows drawn under it', () => {
  it('counts a four line written file as four, not five', () => {
    const wrote = {
      line: 'Write a.txt',
      toolUseId: 't',
      input: { file_path: 'a.txt', content: 'alpha\nbeta\ngamma\ndelta\n' },
      result: null,
      startedAtMs: 0,
      endedAtMs: null,
    }
    expect(changeCount(wrote as never)).toEqual({ added: 4, removed: 0 })
  })

  it('counts one deleted line as one, not two', () => {
    const cut = {
      line: 'Edit a.txt',
      toolUseId: 't',
      input: { file_path: 'a.txt', old_string: 'gamma\n', new_string: '' },
      result: null,
      startedAtMs: 0,
      endedAtMs: null,
    }
    expect(changeCount(cut as never)).toEqual({ added: 0, removed: 1 })
  })
})
