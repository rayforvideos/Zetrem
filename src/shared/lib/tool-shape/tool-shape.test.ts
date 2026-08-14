import { describe, expect, it } from 'vitest'
import { resultNote, toolShape } from './tool-shape'

describe('toolShape: reading a tool into its own shape', () => {
  it('splits a path into a folder and a name', () => {
    expect(toolShape('Read', { file_path: 'src/entities/agent-session/api/claude/status.ts' })).toEqual({
      kind: 'file',
      verb: 'read',
      dir: 'src/entities/agent-session/api/claude/',
      name: 'status.ts',
    })
    expect(toolShape('Write', { file_path: 'a.ts' })).toMatchObject({ verb: 'write', dir: '', name: 'a.ts' })
    expect(toolShape('Edit', { file_path: 'a.ts' })).toMatchObject({ verb: 'edit' })
    expect(toolShape('MultiEdit', { file_path: 'a.ts' })).toMatchObject({ verb: 'edit' })
  })

  it('reads a command as a command', () => {
    expect(toolShape('Bash', { command: 'npm test -- status' })).toEqual({
      kind: 'command',
      command: 'npm test -- status',
    })
  })

  it('separates what is searched for from where', () => {
    expect(toolShape('Grep', { pattern: 'childOpen', path: 'src' })).toEqual({
      kind: 'search',
      pattern: 'childOpen',
      scope: 'src',
    })
    expect(toolShape('Glob', { pattern: '**/*.tsx' })).toMatchObject({ kind: 'search', scope: '' })
  })

  it('keeps only the domain, because a whole URL eats the line', () => {
    expect(toolShape('WebFetch', { url: 'https://registry.npmjs.org/@anthropic-ai/claude-code/latest' })).toEqual({
      kind: 'web',
      label: 'registry.npmjs.org',
    })
    expect(toolShape('WebSearch', { query: 'electron transparent window flash' })).toEqual({
      kind: 'web',
      label: 'electron transparent window flash',
    })
  })

  it('leaves a broken address alone rather than showing an empty line', () => {
    expect(toolShape('WebFetch', { url: 'not a url' })).toEqual({ kind: 'web', label: 'not a url' })
  })

  it('separates who a subagent is from what it was given', () => {
    expect(toolShape('Agent', { subagent_type: 'code-reviewer', description: '리뷰' })).toEqual({
      kind: 'agent',
      subagentType: 'code-reviewer',
      description: '리뷰',
    })
    expect(toolShape('Task', { subagent_type: 'Explore' })).toMatchObject({ kind: 'agent' })
  })

  it('gives a todo list a shape of its own', () => {
    expect(toolShape('TodoWrite', { todos: [] })).toEqual({ kind: 'todo' })
  })

  it('keeps just the name of a tool it does not know', () => {
    expect(toolShape('ScheduleWakeup', { delaySeconds: 60 })).toEqual({
      kind: 'plain',
      name: 'ScheduleWakeup',
    })
  })

  it('falls back to a plain line when the input is not the expected shape', () => {
    expect(toolShape('Read', null)).toEqual({ kind: 'plain', name: 'Read' })
    expect(toolShape('Bash', { command: 123 })).toEqual({ kind: 'plain', name: 'Bash' })
  })
})

describe('resultNote: one fact taken out of a result', () => {
  it('counts the lines of a file that was read', () => {
    const note = resultNote({ kind: 'file', verb: 'read', dir: '', name: 'a.ts' }, '1\n2\n3')
    expect(note).toBe('3 lines')
  })

  it('counts the hits of a search', () => {
    const note = resultNote({ kind: 'search', pattern: 'x', scope: '' }, 'a.ts:1\nb.ts:2')
    expect(note).toBe('2 hits')
  })

  it('says so when a search found nothing, because a blank reads as neither', () => {
    expect(resultNote({ kind: 'search', pattern: 'x', scope: '' }, '')).toBe('none')
  })

  it('adds nothing to a shape with nothing to count', () => {
    expect(resultNote({ kind: 'command', command: 'ls' }, 'a\nb')).toBeNull()
    expect(resultNote({ kind: 'file', verb: 'read', dir: '', name: 'a.ts' }, null)).toBeNull()
  })
})
