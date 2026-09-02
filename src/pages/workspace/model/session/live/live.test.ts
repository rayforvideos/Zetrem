import { describe, expect, it } from 'vitest'
import type { SessionStatus, StatusState } from '@/entities/agent-session'
import { anySessionLive, sessionLive, stirring } from './live'

function status(session: StatusState['session']): StatusState {
  return {
    usage: 'read',
    usageAtMs: null,
    session,
    probed: false,
    context: { used: 0, window: null },
    limits: [],
    cost: {
      usd: 0,
      turns: 0,
      lastTurnUsd: 0,
      durationMs: 0,
      tokens: { in: 0, out: 0, cacheRead: 0, cacheCreate: 0 },
    },
    update: null,
    activity: 'idle',
  }
}

const probed = { id: 's', cwd: '/w', model: 'm' } as unknown as StatusState['session']

describe('sessionLive: whether a conversation is actually under way', () => {
  it('is live while a session is known and the conversation has not finished', () => {
    for (const state of ['working', 'waiting', 'reported'] as SessionStatus[]) {
      expect(sessionLive(status(probed), state), state).toBe(true)
    }
  })

  it('is not live once the conversation is done, however much was learned about it', () => {
    expect(sessionLive(status(probed), 'done')).toBe(false)
  })

  it('is not live before anything has been learned at all', () => {
    expect(sessionLive(status(null), 'working')).toBe(false)
  })

  it('does not take a probe for a running conversation, which is the whole point', () => {
    expect(sessionLive(status(probed), 'done')).toBe(false)
  })
})

describe('stirring: whether anyone is actually at work', () => {
  it('stirs while the orchestrator is working', () => {
    expect(stirring('working', [])).toBe(true)
  })

  it('rests once the turn is over and it is waiting on a person', () => {
    expect(stirring('waiting', [])).toBe(false)
  })

  it('rests when the session has ended', () => {
    expect(stirring('done', [])).toBe(false)
  })

  it('stirs while a teammate is still working, even between turns', () => {
    expect(stirring('waiting', [{ status: 'done' }, { status: 'working' }])).toBe(true)
  })

  it('rests when every teammate has reported and stopped', () => {
    expect(stirring('waiting', [{ status: 'reported' }, { status: 'done' }])).toBe(false)
  })
})

describe('anySessionLive: what an account change has to weigh', () => {
  it('counts a reply running behind another chat, with this one idle', () => {
    expect(anySessionLive(false, { other: 'working' })).toBe(true)
  })

  it('counts a background chat waiting on a permission', () => {
    expect(anySessionLive(false, { other: 'asking' })).toBe(true)
  })

  it('still counts the chat on screen when nothing else is going', () => {
    expect(anySessionLive(true, {})).toBe(true)
  })

  it('is nothing to warn about when every chat is idle', () => {
    expect(anySessionLive(false, {})).toBe(false)
  })
})
