import { describe, expect, it } from 'vitest'
import type { AgentSession, SessionStatus } from '@/entities/agent-session'
import { stirring } from '../live/live'
import { settledNow } from './settle-nudge'

function session(id: string, status: SessionStatus): AgentSession {
  return {
    id,
    runnerId: 'subagent',
    label: id,
    subagentType: 'Explore',
    model: 'subagent',
    status,
    headline: '',
    stream: [],
    transcript: [],
    tokens: 0,
    contextUsed: 0,
    startedAtMs: 0,
  }
}

type Frame = { orchestrator: SessionStatus; children: AgentSession[] }

function settlesOverRun(frames: Frame[]): number {
  let wasBusy = false
  let settles = 0
  for (const frame of frames) {
    const busy = stirring(frame.orchestrator, frame.children)
    if (settledNow(wasBusy, busy)) settles += 1
    wasBusy = busy
  }
  return settles
}

describe('settledNow: the done nudge fires on the busy -> idle edge only', () => {
  it('does not fire while still busy, or while busy stays false', () => {
    expect(settledNow(false, true)).toBe(false)
    expect(settledNow(true, true)).toBe(false)
    expect(settledNow(false, false)).toBe(false)
  })

  it('fires only on the true -> false edge', () => {
    expect(settledNow(true, false)).toBe(true)
  })

  it('fires exactly once, at the end, across dispatch -> wait -> resume -> finish', () => {
    const frames: Frame[] = [
      // Orchestrator takes the turn, no teammates yet.
      { orchestrator: 'working', children: [] },
      // It hands off to two teammates and goes idle itself.
      { orchestrator: 'waiting', children: [session('a', 'working'), session('b', 'working')] },
      // One teammate reports back; the orchestrator wakes to relay it.
      { orchestrator: 'working', children: [session('a', 'reported'), session('b', 'working')] },
      // Orchestrator is done relaying, one teammate still out.
      { orchestrator: 'waiting', children: [session('a', 'reported'), session('b', 'working')] },
      // Orchestrator wakes once more for the last result.
      { orchestrator: 'working', children: [session('a', 'reported'), session('b', 'reported')] },
      // Everyone is quiet.
      { orchestrator: 'waiting', children: [session('a', 'reported'), session('b', 'reported')] },
    ]
    expect(settlesOverRun(frames)).toBe(1)
  })

  it('fires once when the orchestrator finishes solo, with no teammates at all', () => {
    const frames: Frame[] = [
      { orchestrator: 'working', children: [] },
      { orchestrator: 'waiting', children: [] },
    ]
    expect(settlesOverRun(frames)).toBe(1)
  })

  it('does not fire while a teammate is merely reported or waiting, not working', () => {
    const frames: Frame[] = [
      { orchestrator: 'working', children: [session('a', 'working')] },
      { orchestrator: 'waiting', children: [session('a', 'reported')] },
    ]
    expect(settlesOverRun(frames)).toBe(1)
  })
})
