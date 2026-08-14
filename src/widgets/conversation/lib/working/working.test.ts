import { describe, expect, it } from 'vitest'
import type { Turn } from '@/entities/conversation'
import { doingOf, elapsedLabel, tokenLabel } from './working'

function turn(overrides: Partial<Turn> = {}): Turn {
  return {
    role: 'assistant',
    text: '',
    tools: [],
    draft: '',
    thinking: '',
    startedAtMs: 0,
    ...overrides,
  }
}

describe('saying what is happening while you wait', () => {
  it('is starting when there is no turn yet', () => {
    expect(doingOf(null)).toBe('Starting')
  })

  it('takes the tool without a result as the thing being done', () => {
    const running = turn({
      tools: [{ line: 'Bash npm test', toolUseId: 't', input: { command: 'npm test' }, result: null }],
    })
    expect(doingOf(running)).toBe('Running')
  })

  it('stops naming a tool once it has finished', () => {
    const done = turn({
      thinking: '음',
      tools: [
        {
          line: 'Read a.ts',
          toolUseId: 't',
          input: { file_path: 'a.ts' },
          result: { stdout: 'x', stderr: '', isError: false, interrupted: false },
        },
      ],
    })
    expect(doingOf(done)).toBe('Thinking')
  })

  it('is writing while words are coming', () => {
    expect(doingOf(turn({ draft: '반쯤 쓴' }))).toBe('Writing')
  })

  it('lets the kind of tool name the work', () => {
    expect(doingOf(turn({ tools: [{ line: 'Read a.ts', toolUseId: 't', input: { file_path: 'a.ts' }, result: null }] }))).toBe('Reading')
    expect(doingOf(turn({ tools: [{ line: 'Grep foo', toolUseId: 't', input: { pattern: 'foo' }, result: null }] }))).toBe('Searching')
  })
})

describe('numbers are set in words a person can read', () => {
  it('splits into minutes and seconds past a minute', () => {
    expect(elapsedLabel(3000)).toBe('3s')
    expect(elapsedLabel(75_000)).toBe('1m 15s')
  })

  it('says nothing about tokens when there are none, rather than drawing a zero', () => {
    expect(tokenLabel(0)).toBe('')
    expect(tokenLabel(-5)).toBe('')
  })

  it('folds thousands into k', () => {
    expect(tokenLabel(240)).toBe('240 out')
    expect(tokenLabel(1240)).toBe('1.2k out')
  })
})
