import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import { runsOf, stepTo } from './runs'

function session(id: string, overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id,
    runnerId: 'subagent',
    label: id,
    subagentType: 'Explore',
    model: 'subagent',
    status: 'done',
    headline: '',
    stream: [],
    transcript: [],
    tokens: 0,
    contextUsed: 0,
    startedAtMs: 0,
    ...overrides,
  }
}

describe('runsOf: every time this teammate was called on', () => {
  it('gathers the other runs of the same teammate, oldest first', () => {
    const one = session('a', { startedAtMs: 300 })
    const two = session('b', { startedAtMs: 100 })
    const other = session('c', { subagentType: 'Plan' })
    expect(runsOf([one, two, other], one).map((run) => run.id)).toEqual(['b', 'a'])
  })

  it('leaves out a different teammate', () => {
    const mine = session('a')
    const theirs = session('b', { subagentType: 'Plan' })
    expect(runsOf([mine, theirs], mine)).toHaveLength(1)
  })

  it('falls back to the label when there is no type to go on', () => {
    const one = session('a', { subagentType: '', label: 'siena', startedAtMs: 1 })
    const two = session('b', { subagentType: '', label: 'siena', startedAtMs: 2 })
    expect(runsOf([one, two], one).map((run) => run.id)).toEqual(['a', 'b'])
  })

  it('always includes the run you are looking at', () => {
    const only = session('a')
    expect(runsOf([only], only).map((run) => run.id)).toEqual(['a'])
  })
})

describe('stepTo: paging between runs', () => {
  const runs = [session('a'), session('b'), session('c')]

  it('walks back to the run before', () => {
    expect(stepTo(runs, 1, -1)).toBe('a')
  })

  it('walks on to the run after', () => {
    expect(stepTo(runs, 1, 1)).toBe('c')
  })

  it('stops at the first run', () => {
    expect(stepTo(runs, 0, -1)).toBeNull()
  })

  it('stops at the last run', () => {
    expect(stepTo(runs, 2, 1)).toBeNull()
  })
})
