import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import { focusOf } from './focus'

function session(over: Partial<AgentSession> = {}): AgentSession {
  return {
    id: 'a',
    label: 'reads',
    subagentType: 'explore',
    model: 'opus',
    status: 'working',
    headline: '',
    outcome: '',
    doing: '',
    stream: [],
    transcript: [],
    tokens: 0,
    contextUsed: 0,
    startedAtMs: 1000,
    ...over,
  } as AgentSession
}

describe('focusOf: one of them is always the one you are looking at', () => {
  it('has nobody to look at when nobody is out', () => {
    expect(focusOf([], null)).toBeNull()
  })

  it('picks one on its own rather than leaving the panel empty', () => {
    expect(focusOf([session({ id: 'a' }), session({ id: 'b' })], null)).toBe('a')
  })

  it('keeps the one you chose while they are still out', () => {
    expect(focusOf([session({ id: 'a' }), session({ id: 'b' })], 'b')).toBe('b')
  })

  it('moves on once the one you were watching has gone', () => {
    expect(focusOf([session({ id: 'a' })], 'gone')).toBe('a')
  })

  it('takes the one that needs you over the ones that do not', () => {
    const held = [
      session({ id: 'a', status: 'working', startedAtMs: 10 }),
      session({ id: 'b', status: 'waiting', waitingSinceMs: 9000 }),
    ]
    expect(focusOf(held, null)).toBe('b')
  })

  it('takes someone still working over someone already back', () => {
    const held = [
      session({ id: 'a', status: 'reported', startedAtMs: 10 }),
      session({ id: 'b', status: 'working', startedAtMs: 5000 }),
    ]
    expect(focusOf(held, null)).toBe('b')
  })

  it('takes the one out longest among equals, so the choice does not wander', () => {
    const held = [session({ id: 'a', startedAtMs: 5000 }), session({ id: 'b', startedAtMs: 1000 })]
    expect(focusOf(held, null)).toBe('b')
  })
})
