import { describe, expect, it } from 'vitest'
import type { ToolActivity } from '@/entities/conversation'
import type { Turn } from '@/entities/conversation'
import { askedAtMs, doingOf, elapsedLabel, tokenLabel } from './working'

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

function tool(line: string, input: unknown, result: ToolActivity['result'] = null): ToolActivity {
  return { line, toolUseId: 't', input, result, startedAtMs: 0, endedAtMs: result === null ? null : 100 }
}

describe('saying what is happening while you wait', () => {
  it('is starting when there is no turn yet', () => {
    expect(doingOf([]).verb).toBe('Starting')
  })

  it('takes the tool without a result as the thing being done', () => {
    const running = turn({
      tools: [tool('Bash npm test', { command: 'npm test' })],
    })
    expect(doingOf([running]).verb).toBe('Running')
  })

  it('stops naming a tool once it has finished', () => {
    const done = turn({
      thinking: '음',
      tools: [
        tool('Read a.ts', { file_path: 'a.ts' }, { stdout: 'x', stderr: '', isError: false, interrupted: false }),
      ],
    })
    expect(doingOf([done]).verb).toBe('Thinking')
  })

  it('is writing while words are coming', () => {
    expect(doingOf([turn({ draft: '반쯤 쓴' })]).verb).toBe('Writing')
  })

  it('stops saying writing once the words have landed', () => {
    expect(doingOf([turn({ draft: '', text: '다 썼습니다' })]).verb).toBe('Working')
  })

  it('does not go back to thinking after it has spoken', () => {
    expect(doingOf([turn({ thinking: '음', text: '다 썼습니다', draft: '' })]).verb).toBe('Working')
  })

  it('hands off for a moment, then says it is waiting on them', () => {
    const away = turn({
      tools: [tool('Task', { subagent_type: 'explore', description: 'maps the src tree' })],
    })
    expect(doingOf([away], 500).verb).toBe('Handing off')
    expect(doingOf([away], 40_000).verb).toBe('Waiting on')
  })

  it('counts the teammates rather than naming only the last one', () => {
    const away = turn({
      tools: [
        tool('Task', { subagent_type: 'explore', description: 'one' }),
        tool('Task', { subagent_type: 'plan', description: 'two' }),
      ],
    })
    expect(doingOf([away], 40_000).target).toBe('2 teammates')
  })

  it('says it is reading the report once a teammate is back', () => {
    const back = turn({
      tools: [
        tool('Task', { subagent_type: 'explore', description: 'maps the src tree' }, {
          stdout: 'here is what I found',
          stderr: '',
          isError: false,
          interrupted: false,
        }),
      ],
    })
    const doing = doingOf([back], 40_000)
    expect(doing.verb).toBe('Reading')
    expect(doing.target.endsWith("'s report")).toBe(true)
  })

  it('does not leave that gap saying nothing in particular', () => {
    const plain = turn({
      tools: [
        tool('Bash ls', { command: 'ls' }, { stdout: '', stderr: '', isError: false, interrupted: false }),
      ],
    })
    expect(doingOf([plain], 40_000).verb).toBe('Working')
  })

  it('lets the kind of tool name the work', () => {
    expect(doingOf([turn({ tools: [tool('Read a.ts', { file_path: 'a.ts' })] })]).verb).toBe('Reading')
    expect(doingOf([turn({ tools: [tool('Grep foo', { pattern: 'foo' })] })]).verb).toBe('Searching')
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

describe('the working row names what is being worked on, not only the verb', () => {
  it('carries the name of the file being read, so the row says which one', () => {
    const doing = doingOf([turn({ tools: [tool('Read src/app.ts', { file_path: 'src/app.ts' })] })])
    expect(doing.verb).toBe('Reading')
    expect(doing.target).toBe('app.ts')
    expect(doing.shape?.kind).toBe('file')
  })

  it('carries the command being run', () => {
    const doing = doingOf([turn({ tools: [tool('Bash npm test', { command: 'npm test' })] })])
    expect(doing.target).toBe('npm test')
  })

  it('has nothing to point at while it is only writing', () => {
    const doing = doingOf([turn({ draft: '반쯤' })])
    expect(doing.target).toBe('')
    expect(doing.shape).toBeNull()
  })
})

describe('askedAtMs: the clock runs from when you asked, not from the latest reply', () => {
  it('takes the last thing the person said', () => {
    const turns = [
      turn({ role: 'user', startedAtMs: 1000 }),
      turn({ startedAtMs: 4000 }),
      turn({ startedAtMs: 9000 }),
    ]
    expect(askedAtMs(turns, 0)).toBe(1000)
  })

  it('does not restart when the assistant opens another turn', () => {
    const before = askedAtMs([turn({ role: 'user', startedAtMs: 1000 })], 0)
    const after = askedAtMs([turn({ role: 'user', startedAtMs: 1000 }), turn({ startedAtMs: 8000 })], 0)
    expect(after).toBe(before)
  })

  it('falls back to the last turn when nobody has spoken yet', () => {
    expect(askedAtMs([turn({ role: 'system', startedAtMs: 500 })], 77)).toBe(500)
    expect(askedAtMs([], 77)).toBe(77)
  })
})
