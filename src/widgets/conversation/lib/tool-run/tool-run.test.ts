import { describe, expect, it } from 'vitest'
import type { ToolActivity } from '@/entities/conversation'
import { marksOfTools, splitRun, summarise } from './tool-run'

function tool(line: string, overrides: Partial<ToolActivity> = {}): ToolActivity {
  return {
    line,
    toolUseId: line,
    input: null,
    result: null,
    startedAtMs: 0,
    endedAtMs: 100,
    ...overrides,
  }
}

function many(count: number): ToolActivity[] {
  return Array.from({ length: count }, (_, at) => tool(`Read ${at}.ts`))
}

describe('splitRun: how much of a long stretch of tool work to fold away', () => {
  it('leaves a short stretch alone, since folding would hide more than it saves', () => {
    const few = many(5)
    expect(splitRun(few)).toEqual({ folded: [], shown: few })
  })

  it('folds the older steps away once a stretch runs long', () => {
    const lots = many(30)
    const { folded, shown } = splitRun(lots)
    expect(folded).toHaveLength(26)
    expect(shown).toHaveLength(4)
  })

  it('keeps the newest steps in view, because that is where the work is now', () => {
    const { shown } = splitRun(many(30))
    expect(shown.at(-1)!.line).toBe('Read 29.ts')
  })

  it('loses nothing: what is folded plus what is shown is the whole stretch', () => {
    const lots = many(17)
    const { folded, shown } = splitRun(lots)
    expect([...folded, ...shown]).toEqual(lots)
  })
})

describe('summarise: what a folded stretch amounts to', () => {
  it('counts each kind of work in plain words', () => {
    const said = summarise([tool('Read a.ts'), tool('Read b.ts'), tool('Bash npm test')])
    expect(said).toBe('2 files read · 1 command run')
  })

  it('speaks of one thing in the singular', () => {
    expect(summarise([tool('Edit a.ts')])).toBe('1 file changed')
  })

  it('falls back to a count when it cannot name the work', () => {
    expect(summarise([tool('TodoWrite'), tool('TodoWrite')])).toBe('2 steps')
  })
})

describe('marksOfTools: the strip for a stretch of conversation work', () => {
  it('measures a settled call from start to result', () => {
    expect(marksOfTools([tool('Read a.ts', { startedAtMs: 10, endedAtMs: 60 })], 999)[0]!.ms).toBe(
      50,
    )
  })

  it('grows a call that has not come back yet against the clock', () => {
    const open = tool('Bash sleep 30', { startedAtMs: 1000, endedAtMs: null })
    const mark = marksOfTools([open], 4000)[0]!
    expect(mark.ms).toBe(3000)
    expect(mark.running).toBe(true)
  })

  it('reads a failed result as a failed mark', () => {
    const bad = tool('Bash exit 1', {
      result: { stdout: '', stderr: 'boom', isError: true, interrupted: false },
    })
    expect(marksOfTools([bad], 999)[0]!.failed).toBe(true)
  })
})
