import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import { settled } from './settle'

function session(id: string, overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id,
    runnerId: 'subagent',
    label: id,
    subagentType: 'Explore',
    model: 'subagent',
    status: 'reported',
    headline: '',
    stream: [],
    transcript: [],
    tokens: 0,
    contextUsed: 0,
    startedAtMs: 0,
    ...overrides,
  }
}

describe('settled: who has been quiet long enough to call finished', () => {
  it('finishes an agent that reported and then said nothing', () => {
    expect(settled([session('a', { lastSeenAtMs: 1000 })], 8000, 6000)).toEqual(['a'])
  })

  it('waits on an agent that reported a moment ago, because a notice can come mid job', () => {
    expect(settled([session('a', { lastSeenAtMs: 5000 })], 8000, 6000)).toEqual([])
  })

  it('leaves an agent that is working, however long it has been silent', () => {
    const busy = session('a', { status: 'working', lastSeenAtMs: 0 })
    expect(settled([busy], 999_999, 6000)).toEqual([])
  })

  it('says nothing about an agent that is already finished', () => {
    const over = session('a', { status: 'done', lastSeenAtMs: 0 })
    expect(settled([over], 999_999, 6000)).toEqual([])
  })

  it('counts from the start when the agent has not been heard from at all', () => {
    expect(settled([session('a', { startedAtMs: 1000 })], 8000, 6000)).toEqual(['a'])
  })

  it('tolerates a clock reading that lags behind the last thing it heard', () => {
    expect(settled([session('a', { lastSeenAtMs: 9000 })], 8000, 6000)).toEqual([])
  })
})
