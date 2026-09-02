import { describe, expect, it } from 'vitest'
import type { AgentSession } from '../../model/session/session.types'
import { helpersOf, topLevel } from './hierarchy'

function session(id: string, overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id,
    runnerId: 'fake',
    label: `에이전트 ${id}`,
    subagentType: 'general-purpose',
    model: 'demo',
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

describe('topLevel', () => {
  it('keeps only sessions without a parent', () => {
    const sessions = [session('a'), session('b', { parentId: 'a' }), session('c')]
    expect(topLevel(sessions).map((s) => s.id)).toEqual(['a', 'c'])
  })
})

describe('helpersOf', () => {
  it('returns a session’s own children, oldest first', () => {
    const sessions = [
      session('a'),
      session('grandchild-2', { parentId: 'a', startedAtMs: 2_000 }),
      session('grandchild-1', { parentId: 'a', startedAtMs: 1_000 }),
      session('other', { parentId: 'z' }),
    ]
    expect(helpersOf(sessions, 'a').map((s) => s.id)).toEqual(['grandchild-1', 'grandchild-2'])
  })

  it('is empty when the session has no helpers', () => {
    expect(helpersOf([session('a')], 'a')).toEqual([])
  })
})
