import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import { IDLE_QUIET_MS, REPORTED_QUIET_MS, settled } from './settle'

function session(id: string, overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id,
    runnerId: 'subagent',
    label: id,
    subagentType: 'Explore',
    model: 'subagent',
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

const busy = { parentWorking: true }
const idle = { parentWorking: false }

describe('settled: who has gone quiet long enough to call finished', () => {
  it('finishes an agent that reported and then said nothing', () => {
    const done = session('a', { status: 'reported', lastSeenAtMs: 1000 })
    expect(settled([done], { nowMs: 1000 + REPORTED_QUIET_MS, ...busy })).toEqual(['a'])
  })

  it('waits on an agent that reported a moment ago, because a notice can come mid job', () => {
    const fresh = session('a', { status: 'reported', lastSeenAtMs: 5000 })
    expect(settled([fresh], { nowMs: 8000, ...busy })).toEqual([])
  })

  it('finishes an agent that never reported once the work around it has stopped', () => {
    const stuck = session('a', { lastSeenAtMs: 1000 })
    expect(settled([stuck], { nowMs: 1000 + IDLE_QUIET_MS, ...idle })).toEqual(['a'])
  })

  it('leaves a quiet agent alone while the conversation is still working', () => {
    const stuck = session('a', { lastSeenAtMs: 1000 })
    expect(settled([stuck], { nowMs: 999_999, ...busy })).toEqual([])
  })

  it('gives an agent that never reported far longer than one that did', () => {
    const quiet = session('a', { lastSeenAtMs: 0 })
    expect(settled([quiet], { nowMs: REPORTED_QUIET_MS + 1, ...idle })).toEqual([])
    expect(settled([quiet], { nowMs: IDLE_QUIET_MS, ...idle })).toEqual(['a'])
  })

  it('says nothing about an agent that is already finished', () => {
    const over = session('a', { status: 'done', lastSeenAtMs: 0 })
    expect(settled([over], { nowMs: 999_999, ...idle })).toEqual([])
  })

  it('counts from the start when the agent has never been heard from', () => {
    const mute = session('a', { startedAtMs: 1000 })
    expect(settled([mute], { nowMs: 1000 + IDLE_QUIET_MS, ...idle })).toEqual(['a'])
  })

  it('tolerates a clock reading that lags behind the last thing it heard', () => {
    const ahead = session('a', { status: 'reported', lastSeenAtMs: 9000 })
    expect(settled([ahead], { nowMs: 8000, ...busy })).toEqual([])
  })

  it('picks up an agent resumed by a message, which never gets a completion notice', () => {
    const resumed = session('a', { headline: 'Picked up where they left off', lastSeenAtMs: 0 })
    expect(settled([resumed], { nowMs: IDLE_QUIET_MS, ...idle })).toEqual(['a'])
  })
})
