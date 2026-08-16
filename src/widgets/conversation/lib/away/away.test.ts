import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import { awayOf, spokeAtMs } from './away'

function session(overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id: 'a',
    label: 'explore',
    subagentType: 'explore',
    model: 'opus',
    status: 'working',
    headline: 'maps the src tree',
    outcome: '',
    doing: '',
    stream: [],
    transcript: [],
    tokens: 0,
    contextUsed: 0,
    startedAtMs: 1000,
    ...overrides,
  } as AgentSession
}

describe('awayOf: what the one running the session is waiting on', () => {
  it('says nobody when the crew is idle and nothing came back since it last spoke', () => {
    expect(awayOf([])).toBeNull()
    expect(awayOf([session({ status: 'done', lastSeenAtMs: 500 })], 900)).toBeNull()
  })

  it('names the one who is out', () => {
    const away = awayOf([session()])
    expect(away?.verb).toBe('Waiting on')
    expect(away?.count).toBe(1)
    expect(away?.doing).toBe('maps the src tree')
  })

  it('counts them all and starts the clock at the first one out', () => {
    const away = awayOf([
      session({ id: 'a', startedAtMs: 5000 }),
      session({ id: 'b', startedAtMs: 2000 }),
      session({ id: 'c', status: 'done', startedAtMs: 10 }),
    ])
    expect(away?.count).toBe(2)
    expect(away?.many).toBe('2 teammates')
    expect(away?.sinceMs).toBe(2000)
  })

  it('holds the row while a report is back but has not been read', () => {
    const away = awayOf([session({ status: 'reported', lastSeenAtMs: 4000 })], 2000)
    expect(away?.verb).toBe('Reading')
    expect(away?.one).toBe("Explore's report")
    expect(away?.many).toBe('1 reports')
  })

  it('lets go once the answer that read it has begun', () => {
    expect(awayOf([session({ status: 'reported', lastSeenAtMs: 4000 })], 9000)).toBeNull()
  })

  it('prefers the ones still out over the ones already back', () => {
    const away = awayOf(
      [session({ id: 'a', status: 'reported', lastSeenAtMs: 4000 }), session({ id: 'b' })],
      2000,
    )
    expect(away?.verb).toBe('Waiting on')
  })

  it('says nothing about a teammate that never reported anything', () => {
    expect(awayOf([session({ status: 'done', headline: '', lastSeenAtMs: 4000 })], 2000)).toBeNull()
  })
})

describe('spokeAtMs: when the one running the session last began to answer', () => {
  const turn = (role: 'user' | 'assistant', startedAtMs: number) =>
    ({ role, text: '', tools: [], draft: '', thinking: '', startedAtMs }) as never

  it('takes the last answer, not the last message', () => {
    expect(spokeAtMs([turn('assistant', 100), turn('user', 200)])).toBe(100)
  })

  it('is zero before anything has been said, so nothing counts as read', () => {
    expect(spokeAtMs([])).toBe(0)
    expect(spokeAtMs([turn('user', 200)])).toBe(0)
  })
})

describe('a report waiting however long the answer takes to begin', () => {
  it('keeps saying it is reading, since the session is still there to read it', () => {
    const held = [session({ status: 'reported', lastSeenAtMs: 10_000 })]
    expect(awayOf(held, 5000)?.verb).toBe('Reading')
  })
})

describe('a teammate stuck on a question of yours', () => {
  it('counts as out, because they are not coming back until you answer', () => {
    const away = awayOf([session({ status: 'waiting' })], 0)
    expect(away?.verb).toBe('Waiting on')
    expect(away?.count).toBe(1)
  })
})
