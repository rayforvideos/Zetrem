import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import { laneOf } from './lane'

function session(overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id: 'a',
    label: 'explore',
    subagentType: 'explore',
    model: 'opus',
    status: 'working',
    headline: 'maps the tree',
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

const NOW = 61_000

describe('laneOf: one line for one hire', () => {
  it('names the call they are on right now', () => {
    const lane = laneOf(
      session({
        stream: [
          {
            id: 'c1',
            line: 'Read src/app.ts',
            startedAtMs: 2000,
            endedAtMs: null,
            failed: false,
            note: '',
          },
        ],
      }),
      NOW,
    )
    expect(lane.verb).toBe('Reading')
    expect(lane.target).toBe('app.ts')
  })

  it('falls back to what they said they were doing when no call is open', () => {
    expect(laneOf(session({ doing: 'Reading the README' }), NOW).verb).toBe('Reading the README')
  })

  it('says Working rather than nothing when it knows neither', () => {
    expect(laneOf(session(), NOW).verb).toBe('Working')
  })

  it('uses the state word once they are no longer working', () => {
    expect(laneOf(session({ status: 'reported' }), NOW).verb).toBe('Reported back')
    expect(laneOf(session({ status: 'waiting' }), NOW).needsYou).toBe(true)
  })

  it('counts how long they have been out, and stops counting once they are in', () => {
    expect(laneOf(session(), NOW).outMs).toBe(60_000)
    expect(laneOf(session({ endedAtMs: 31_000 }), NOW).outMs).toBe(30_000)
  })
})
