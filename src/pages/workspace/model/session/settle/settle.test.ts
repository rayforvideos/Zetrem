import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import { HELD_QUIET_MS, LOST_QUIET_MS, REPORTED_QUIET_MS, settled } from './settle'

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

  it('never times out an agent the CLI is reporting on, however long it goes quiet', () => {
    const slow = session('a', { taskId: 'task_a', lastSeenAtMs: 0 })
    expect(settled([slow], { nowMs: 99_999_999, ...idle })).toEqual([])
  })

  it('never times out an agent that is waiting on you', () => {
    const asked = session('a', { status: 'waiting', lastSeenAtMs: 0 })
    expect(settled([asked], { nowMs: 99_999_999, ...idle })).toEqual([])
  })

  it('gives up on an agent it was never told about, but only after a long wait', () => {
    const lost = session('a', { lastSeenAtMs: 1000 })
    expect(settled([lost], { nowMs: 1000 + LOST_QUIET_MS - 1, ...idle })).toEqual([])
    expect(settled([lost], { nowMs: 1000 + LOST_QUIET_MS, ...idle })).toEqual(['a'])
  })

  it('leaves even a lost agent alone while the conversation is still working', () => {
    const lost = session('a', { lastSeenAtMs: 0 })
    expect(settled([lost], { nowMs: 99_999_999, ...busy })).toEqual([])
  })

  it('waits far longer on a lost agent than on one that has already reported', () => {
    expect(LOST_QUIET_MS).toBeGreaterThan(REPORTED_QUIET_MS * 50)
  })

  it('says nothing about an agent that is already finished', () => {
    const over = session('a', { status: 'done', lastSeenAtMs: 0 })
    expect(settled([over], { nowMs: 99_999_999, ...idle })).toEqual([])
  })

  it('counts from the start when the agent has never been heard from', () => {
    const mute = session('a', { startedAtMs: 1000 })
    expect(settled([mute], { nowMs: 1000 + LOST_QUIET_MS, ...idle })).toEqual(['a'])
  })

  it('tolerates a clock reading that lags behind the last thing it heard', () => {
    const ahead = session('a', { status: 'reported', lastSeenAtMs: 9000 })
    expect(settled([ahead], { nowMs: 8000, ...busy })).toEqual([])
  })

  it('picks up an agent resumed by a message, which the CLI never reports a task for', () => {
    const resumed = session('a', { headline: 'Picked up where they left off', lastSeenAtMs: 0 })
    expect(settled([resumed], { nowMs: LOST_QUIET_MS, ...idle })).toEqual(['a'])
  })

  it('lets a report held for a shell stand once nothing has been heard for a while', () => {
    const held = session('a', { taskId: 't', heldAtMs: 0 })
    expect(settled([held], { nowMs: HELD_QUIET_MS - 1, ...idle })).toEqual([])
    expect(settled([held], { nowMs: HELD_QUIET_MS, ...idle })).toEqual(['a'])
    expect(settled([held], { nowMs: HELD_QUIET_MS, ...busy })).toEqual(['a'])
  })

  it('counts the hold from the last thing heard, not from the hold alone', () => {
    const held = session('a', { taskId: 't', heldAtMs: 0, lastSeenAtMs: 30_000 })
    expect(settled([held], { nowMs: HELD_QUIET_MS + 10_000, ...idle })).toEqual([])
    expect(settled([held], { nowMs: HELD_QUIET_MS + 30_000, ...idle })).toEqual(['a'])
  })
})

describe('settled: the rule that closed a tile is said out loud, for the diagnostics', () => {
  function rules(children: AgentSession[], at: { nowMs: number; parentWorking: boolean }) {
    const said: string[] = []
    settled(children, at, (id, rule) => said.push(`${id}: ${rule}`))
    return said
  }

  it('names the rule when a report stood and nothing more came', () => {
    const done = session('a', { status: 'reported', lastSeenAtMs: 1000 })
    expect(rules([done], { nowMs: 1000 + REPORTED_QUIET_MS, ...busy })).toEqual([
      'a: the report stood and nothing more was said',
    ])
  })

  it('names the rule when a held report was never released by its shell', () => {
    const held = session('a', { heldAtMs: 1000, lastSeenAtMs: 1000, taskId: 'task_a' })
    expect(rules([held], { nowMs: 1000 + HELD_QUIET_MS, ...busy })).toEqual([
      'a: the held report stood: no end ever came for its shell',
    ])
  })

  it('names the rule when a tile the runtime never claimed simply went quiet', () => {
    const lost = session('a', { lastSeenAtMs: 1000 })
    expect(rules([lost], { nowMs: 1000 + LOST_QUIET_MS, ...idle })).toEqual([
      'a: lost: the runtime never named it and it went quiet',
    ])
  })

  it('says nothing about a tile it is leaving alone', () => {
    const busyOne = session('a', { taskId: 'task_a', lastSeenAtMs: 0 })
    expect(rules([busyOne], { nowMs: 99_999_999, ...idle })).toEqual([])
  })

  it('closes the same tiles whether or not anybody is listening', () => {
    const lost = session('a', { lastSeenAtMs: 1000 })
    const at = { nowMs: 1000 + LOST_QUIET_MS, ...idle }
    expect(settled([lost], at)).toEqual(settled([lost], at, () => undefined))
  })
})
