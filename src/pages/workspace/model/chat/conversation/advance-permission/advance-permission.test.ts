import { describe, expect, it } from 'vitest'
import { askOf } from './advance-permission'

const base = { requestId: 'r1', toolName: 'Write', line: 'Write src/sub.js', detail: 'src/sub.js' }

describe('askOf: what the approval card is handed', () => {
  it('cuts a write into the lines it would add, so the card can show them', () => {
    const ask = askOf({ ...base, input: { file_path: 'src/sub.js', content: 'a\nb\n' } })
    expect(ask.change).toEqual([
      [
        { kind: 'add', text: 'a' },
        { kind: 'add', text: 'b' },
      ],
    ])
    expect(ask.count).toEqual({ added: 2, removed: 0 })
  })

  it('counts both sides of an edit', () => {
    const ask = askOf({
      ...base,
      toolName: 'Edit',
      input: { file_path: 'src/a.ts', old_string: 'one\n', new_string: 'two\nthree\n' },
    })
    expect(ask.count).toEqual({ added: 2, removed: 1 })
  })

  it('says nothing about a change for a tool that makes none', () => {
    const ask = askOf({
      ...base,
      toolName: 'Bash',
      line: 'Bash ls',
      detail: 'ls',
      input: { command: 'ls' },
    })
    expect(ask.change).toBeUndefined()
    expect(ask.count).toBeUndefined()
  })

  it('leaves the raw input behind, so a whole file does not sit in the store', () => {
    const ask = askOf({ ...base, input: { file_path: 'src/sub.js', content: 'a\n' } })
    expect(ask).not.toHaveProperty('input')
  })

  it('carries a plan through untouched, since prose is what is being approved', () => {
    const ask = askOf({
      ...base,
      toolName: 'ExitPlanMode',
      plan: '## Steps',
      input: { plan: '## Steps' },
    })
    expect(ask.plan).toBe('## Steps')
  })
})
