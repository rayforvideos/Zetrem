import { describe, expect, it } from 'vitest'
import { changeLines } from './change-lines'

describe('changeLines: cutting the groups a diff view draws, out of a tool call', () => {
  it('draws an edit as one group', () => {
    const groups = changeLines('Edit', { old_string: 'a', new_string: 'b' })
    expect(groups).toHaveLength(1)
    expect(groups[0]).toEqual([
      { kind: 'remove', text: 'a' },
      { kind: 'add', text: 'b' },
    ])
  })

  it('draws a multi-edit as one group per valid edit, skipping a malformed one', () => {
    const groups = changeLines('MultiEdit', {
      edits: [
        { old_string: 'a', new_string: 'b' },
        { old_string: 'x' },
        { old_string: 'c', new_string: 'd' },
      ],
    })
    expect(groups).toHaveLength(2)
    expect(groups[0]).toEqual([
      { kind: 'remove', text: 'a' },
      { kind: 'add', text: 'b' },
    ])
    expect(groups[1]).toEqual([
      { kind: 'remove', text: 'c' },
      { kind: 'add', text: 'd' },
    ])
  })

  it('draws a write as one group of pure additions', () => {
    const groups = changeLines('Write', { content: 'x\ny' })
    expect(groups).toEqual([
      [
        { kind: 'add', text: 'x' },
        { kind: 'add', text: 'y' },
      ],
    ])
  })

  it('draws a notebook edit as one group when it carries a new source', () => {
    const groups = changeLines('NotebookEdit', { new_source: 'print(1)' })
    expect(groups).toEqual([[{ kind: 'add', text: 'print(1)' }]])
  })

  it('draws nothing for a notebook edit with no new source', () => {
    expect(changeLines('NotebookEdit', { cell_id: 'a' })).toEqual([])
  })

  it('draws nothing for a tool with no view of its own', () => {
    expect(changeLines('Bash', { command: 'ls' })).toEqual([])
  })

  it('draws nothing when the input is the wrong shape', () => {
    expect(changeLines('Edit', null)).toEqual([])
    expect(changeLines('Edit', 'not an object')).toEqual([])
    expect(changeLines('MultiEdit', { edits: 'not an array' })).toEqual([])
    expect(changeLines('Write', { content: 42 })).toEqual([])
  })

  it('drops a group that changed nothing', () => {
    expect(changeLines('Edit', { old_string: '', new_string: '' })).toEqual([])
    expect(changeLines('Write', { content: '' })).toEqual([])
    expect(changeLines('MultiEdit', { edits: [{ old_string: '', new_string: '' }] })).toEqual([])
  })
})
