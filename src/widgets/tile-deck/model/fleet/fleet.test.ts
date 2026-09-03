import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import { arrived, orphaned, retired } from './fleet'

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

describe('arrived: who needs a tile that does not have one', () => {
  it('picks up a session the deck has not placed', () => {
    expect(arrived([session('a')], new Set())).toEqual(['a'])
  })

  it('leaves a session that already has a tile', () => {
    expect(arrived([session('a')], new Set(['a']))).toEqual([])
  })

  it('does not open a tile for someone who already finished', () => {
    expect(arrived([session('a', { status: 'done' })], new Set())).toEqual([])
  })

  it('keeps a reported session on screen, because it may speak again', () => {
    expect(arrived([session('a', { status: 'reported' })], new Set())).toEqual(['a'])
  })

  it('gives a finished agent a tile again once it wakes back up', () => {
    expect(arrived([session('a', { status: 'working' })], new Set())).toEqual(['a'])
  })

  it('never opens a tile for a subagent a teammate called in itself', () => {
    expect(arrived([session('a'), session('helper', { parentId: 'a' })], new Set())).toEqual(['a'])
  })
})

describe('retired: whose tile has been done long enough to close', () => {
  const up = new Set(['a'])

  it('counts the dwell from when the agent finished, not from when it started', () => {
    const long = session('a', { status: 'done', startedAtMs: 0, endedAtMs: 60_000 })
    expect(retired([long], up, 61_000, 4000)).toEqual([])
    expect(retired([long], up, 64_000, 4000)).toEqual(['a'])
  })

  it('falls back to the start time when the end was never stamped', () => {
    expect(retired([session('a', { status: 'done' })], up, 5000, 4000)).toEqual(['a'])
  })

  it('never closes a tile that is still working', () => {
    expect(retired([session('a')], up, 99_999, 4000)).toEqual([])
  })

  it('never closes a tile that is still reported, since it may speak again', () => {
    expect(retired([session('a', { status: 'reported' })], up, 99_999, 4000)).toEqual([])
  })

  it('says nothing about a session whose tile is already off the screen', () => {
    const done = session('a', { status: 'done', endedAtMs: 0 })
    expect(retired([done], new Set(), 99_999, 4000)).toEqual([])
  })

  it('tolerates a clock reading that lags behind the finish', () => {
    const done = session('a', { status: 'done', endedAtMs: 10_000 })
    expect(retired([done], up, 9000, 4000)).toEqual([])
  })
})

describe('a tile whose session is gone from under it', () => {
  it('is let go on sight, since nothing will ever report it finished', () => {
    expect(orphaned([session('a')], new Set(['a', 'b']))).toEqual(['b'])
  })

  it('leaves alone the ones still in the list', () => {
    expect(orphaned([session('a')], new Set(['a']))).toEqual([])
  })

  it('lets the whole board go when the store was emptied', () => {
    expect(orphaned([], new Set(['a', 'b']))).toEqual(['a', 'b'])
  })
})
