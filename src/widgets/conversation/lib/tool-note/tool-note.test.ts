import { describe, expect, it } from 'vitest'
import type { ToolShape } from '@/entities/tool'
import { failureNote, firstSentence, saidNote } from './tool-note'

const READ: ToolShape = { kind: 'file', verb: 'read', dir: '', name: 'a.ts' }
const RAN: ToolShape = { kind: 'command', command: 'ls' }
const FOUND: ToolShape = { kind: 'search', pattern: 'x', scope: '' }
const TEAMMATE: ToolShape = { kind: 'agent', subagentType: 'claude', description: 'look' }

describe('saidNote: what a folded row says came back, once', () => {
  it('counts the lines of a file in the words the app is speaking', () => {
    expect(saidNote(READ, 'a\nb\nc')).toBe('3 lines')
  })

  it('says nothing before the result is in, since nothing has come back', () => {
    expect(saidNote(READ, null)).toBeNull()
  })

  it('counts what a search turned up as hits, and says so when there were none', () => {
    expect(saidNote(FOUND, 'a.ts:1\nb.ts:2')).toBe('2 hits')
    expect(saidNote(FOUND, '')).toBe('none')
  })

  it('shows a one-line answer instead of counting it', () => {
    expect(saidNote(RAN, 'main\n')).toBe('main')
    expect(saidNote(RAN, '   ')).toBe('no output')
  })

  it('falls back to the count when a command said more than a line', () => {
    expect(saidNote(RAN, 'a\nb')).toBe('2 lines')
  })

  it('gives a teammate the first sentence of the report, not a line count', () => {
    const said = saidNote(TEAMMATE, 'The build fails on Windows only. Here is why:\n\nthe path')
    expect(said).toBe('The build fails on Windows only.')
  })

  it('says a teammate reported when the report opens with nothing to quote', () => {
    expect(saidNote(TEAMMATE, '   ')).toBe('reported')
  })
})

describe('failureNote: a failed row says what went wrong', () => {
  it('takes the complaint itself, not the size of it', () => {
    expect(failureNote('File does not exist. Did you mean b.ts?')).toBe('File does not exist.')
  })

  it('still says something when the failure came back silent', () => {
    expect(failureNote('')).toBe('failed')
    expect(failureNote(null)).toBe('failed')
  })
})

describe('firstSentence: the summary a report already wrote', () => {
  it('skips the blank lines a report opens with', () => {
    expect(firstSentence('\n\nDone. Details below.')).toBe('Done.')
  })

  it('keeps a line that never ends a sentence, up to what a row can hold', () => {
    expect(firstSentence('npm ERR! code ELIFECYCLE')).toBe('npm ERR! code ELIFECYCLE')
    expect(firstSentence('x'.repeat(200)).length).toBeLessThanOrEqual(64)
  })
})
