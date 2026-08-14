import { describe, expect, it } from 'vitest'
import { shapeOfLine, tally } from './tool-line'

describe('shapeOfLine: turning a line a child left back into a tool shape', () => {
  it('splits a file line into a folder and a name', () => {
    expect(shapeOfLine('Read src/entities/agent-session/index.ts')).toEqual({
      kind: 'file',
      verb: 'read',
      dir: 'src/entities/agent-session/',
      name: 'index.ts',
    })
  })

  it('tells editing from reading, because the same file can be either', () => {
    expect(shapeOfLine('Edit a.ts')).toMatchObject({ kind: 'file', verb: 'edit' })
    expect(shapeOfLine('Write a.ts')).toMatchObject({ kind: 'file', verb: 'write' })
  })

  it('keeps a whole command, not just the word before the first space', () => {
    expect(shapeOfLine('Bash npm test -- --run')).toEqual({
      kind: 'command',
      command: 'npm test -- --run',
    })
  })

  it('keeps what a search was looking for', () => {
    expect(shapeOfLine('Grep useEffect')).toMatchObject({ kind: 'search', pattern: 'useEffect' })
  })

  it('keeps only the name of something it does not know', () => {
    expect(shapeOfLine('SomeTool 뭔가')).toEqual({ kind: 'plain', name: 'SomeTool' })
  })

  it('holds up for a line with no target', () => {
    expect(shapeOfLine('Read')).toEqual({ kind: 'plain', name: 'Read' })
  })
})

describe('tally: how much was done', () => {
  it('counts the work by kind', () => {
    const counted = tally([
      'Read a.ts',
      'Read b.ts',
      'Edit b.ts',
      'Bash npm test',
      'Grep foo',
      'WebFetch https://x.test/a',
    ])
    expect(counted).toEqual({ read: 2, wrote: 1, ran: 1, searched: 2 })
  })

  it('is all zero when nothing was done', () => {
    expect(tally([])).toEqual({ read: 0, wrote: 0, ran: 0, searched: 0 })
  })
})
