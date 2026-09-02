import { describe, expect, it } from 'vitest'
import type { AgentSession, SessionStatus } from '@/entities/agent-session'
import { stirring } from '../live/live'
import { SETTLE_GRACE_MS, settledAfter } from './settle-nudge'

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

describe('settledAfter: the done nudge fires only once idle has held for a grace period', () => {
  it('never settles while nothing has gone idle yet', () => {
    expect(settledAfter(null, 0)).toBe(false)
    expect(settledAfter(null, 999_999)).toBe(false)
  })

  it('does not settle before the grace period has elapsed', () => {
    expect(settledAfter(1000, 1000 + SETTLE_GRACE_MS - 1)).toBe(false)
  })

  it('settles once the grace period has fully elapsed', () => {
    expect(settledAfter(1000, 1000 + SETTLE_GRACE_MS)).toBe(true)
    expect(settledAfter(1000, 1000 + SETTLE_GRACE_MS + 5000)).toBe(true)
  })

  it('does not settle on a brief idle gap that busy interrupts, only after a gap that holds', () => {
    // A teammate finishes at t=0; the orchestrator wakes to relay it at
    // t=300, well inside the grace period, so that gap must not settle.
    // It goes idle for good at t=500; the grace period from there must
    // settle, and only once.
    const samples: Array<{ idleSinceMs: number | null; nowMs: number }> = [
      { idleSinceMs: 0, nowMs: 100 },
      { idleSinceMs: 0, nowMs: 300 },
      { idleSinceMs: null, nowMs: 300 }, // orchestrator busy again: grace cancelled
      { idleSinceMs: 500, nowMs: 600 },
      { idleSinceMs: 500, nowMs: 1000 },
      { idleSinceMs: 500, nowMs: 500 + SETTLE_GRACE_MS - 1 },
      { idleSinceMs: 500, nowMs: 500 + SETTLE_GRACE_MS },
    ]
    const settled = samples.filter((sample) => settledAfter(sample.idleSinceMs, sample.nowMs))
    expect(settled).toHaveLength(1)
    expect(settled[0]?.nowMs).toBe(500 + SETTLE_GRACE_MS)
  })

  it('fires once across dispatch -> wait -> resume -> finish, not once per teammate', () => {
    // Same shape as a real run: the orchestrator's own busy/idle edges,
    // each timestamped, tracked the way useNudge tracks them (idleSinceMs
    // reset on every busy edge, and checked once the grace period from the
    // last idle-since would have elapsed).
    const frames: Array<{ atMs: number; orchestrator: SessionStatus; children: AgentSession[] }> = [
      { atMs: 0, orchestrator: 'working', children: [] },
      {
        atMs: 200,
        orchestrator: 'waiting',
        children: [session('a', 'working'), session('b', 'working')],
      },
      // The orchestrator wakes 250ms later to relay a's result, well inside grace.
      {
        atMs: 450,
        orchestrator: 'working',
        children: [session('a', 'reported'), session('b', 'working')],
      },
      {
        atMs: 600,
        orchestrator: 'waiting',
        children: [session('a', 'reported'), session('b', 'working')],
      },
      // b reports; the orchestrator wakes again 300ms later for the last relay.
      {
        atMs: 900,
        orchestrator: 'working',
        children: [session('a', 'reported'), session('b', 'reported')],
      },
      {
        atMs: 1100,
        orchestrator: 'waiting',
        children: [session('a', 'reported'), session('b', 'reported')],
      },
    ]

    let wasBusy = false
    let idleSinceMs: number | null = null
    let firedAtMs: number | null = null
    for (const frame of frames) {
      const busy = stirring(frame.orchestrator, frame.children)
      if (busy) {
        idleSinceMs = null
      } else if (wasBusy) {
        idleSinceMs = frame.atMs
      }
      wasBusy = busy
      // A real setTimeout would fire SETTLE_GRACE_MS after idleSinceMs was
      // set, unless a later frame in this loop cancels it first; simulate
      // that by checking at each frame whether the pending timer's fire
      // time has already passed without the timer having been cancelled.
      if (idleSinceMs !== null && settledAfter(idleSinceMs, frame.atMs)) {
        firedAtMs = frame.atMs
      }
    }
    // None of the frames above sit at or past idleSinceMs + grace while
    // still idle, so nothing should have fired yet from this walk alone;
    // the real timer fires later, off this frame list, once the final
    // idle gap (starting at 1100ms) holds for the full grace period.
    expect(firedAtMs).toBeNull()
    expect(idleSinceMs).toBe(1100)
    expect(settledAfter(idleSinceMs, 1100 + SETTLE_GRACE_MS)).toBe(true)
  })

  it('settles once when the orchestrator finishes solo, with no teammates at all', () => {
    const idleSinceMs = 0
    expect(settledAfter(idleSinceMs, SETTLE_GRACE_MS - 1)).toBe(false)
    expect(settledAfter(idleSinceMs, SETTLE_GRACE_MS)).toBe(true)
  })

  it('settles once a teammate is merely reported or waiting, not working, and it holds', () => {
    const busyThenIdle = stirring('working', [session('a', 'working')])
    const idleNow = stirring('waiting', [session('a', 'reported')])
    expect(busyThenIdle).toBe(true)
    expect(idleNow).toBe(false)
    expect(settledAfter(0, SETTLE_GRACE_MS)).toBe(true)
  })
})
