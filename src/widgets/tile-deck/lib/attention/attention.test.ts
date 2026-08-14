import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import { attentionId } from './attention'

function session(id: string, overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id,
    runnerId: 'fake',
    label: `에이전트 ${id}`,
    subagentType: 'general-purpose',
    model: 'demo-1',
    status: 'working',
    headline: '',
    stream: [],
    transcript: [],
    tokens: 0,
    contextUsed: 0,
    startedAtMs: 0,
    ...overrides,
  }
}

function waiting(id: string, since?: number): AgentSession {
  return session(id, since === undefined ? { status: 'waiting' } : { status: 'waiting', waitingSinceMs: since })
}

describe('attentionId', () => {
  it('draws no eye when nothing is waiting', () => {
    expect(attentionId([])).toBeNull()
    expect(attentionId([session('a'), session('b', { status: 'done' })])).toBeNull()
  })

  it('gives the eye to the one thing that is waiting', () => {
    expect(attentionId([session('a'), waiting('b', 10), session('c')])).toBe('b')
  })

  it('picks the one that has waited longest when several wait', () => {
    const chosen = attentionId([waiting('a', 300), waiting('b', 100), waiting('c', 200)])
    expect(chosen).toBe('b')
  })

  it('still picks one out of six, because six pulling at once is no rule at all', () => {
    const all = [0, 1, 2, 3, 4, 5].map((i) => waiting(`s${i}`, 500 + i))
    expect(attentionId(all)).toBe('s0')
  })

  it('breaks a tie by list order, so the answer is always the same one', () => {
    expect(attentionId([waiting('a', 100), waiting('b', 100)])).toBe('a')
  })

  it('yields to a session whose wait is known', () => {
    expect(attentionId([waiting('a'), waiting('b', 900)])).toBe('b')
    expect(attentionId([waiting('a'), waiting('b')])).toBe('a')
  })

  it('leaves working and finished tiles out of the running', () => {
    const sessions = [
      session('a', { status: 'working', waitingSinceMs: 1 }),
      session('b', { status: 'done', waitingSinceMs: 2 }),
      waiting('c', 999),
    ]
    expect(attentionId(sessions)).toBe('c')
  })
})
