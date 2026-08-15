import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STREAM_BUFFER, TRANSCRIPT_BUFFER } from '../session'
import type { AgentSession } from '../session.types'
import { sessionStore } from './session-store'

function session(id: string): AgentSession {
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
  }
}

beforeEach(() => {
  sessionStore.clear()
})

describe('sessionStore', () => {
  it('keeps sessions in the order they opened', () => {
    sessionStore.open(session('a'))
    sessionStore.open(session('b'))
    expect(sessionStore.get().map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('changes only the fields it was given', () => {
    sessionStore.open(session('a'))
    sessionStore.patch('a', { status: 'done', tokens: 120 })
    const found = sessionStore.get()[0]!
    expect(found.status).toBe('done')
    expect(found.tokens).toBe(120)
    expect(found.label).toBe('에이전트 a')
  })

  it('stamps when the wait began and clears it on the way out, which is how the eye is chosen', () => {
    vi.useFakeTimers()
    vi.setSystemTime(5_000)
    sessionStore.open(session('a'))
    expect(sessionStore.get()[0]!.waitingSinceMs).toBeUndefined()

    sessionStore.patch('a', { status: 'waiting' })
    expect(sessionStore.get()[0]!.waitingSinceMs).toBe(5_000)

    vi.setSystemTime(9_000)
    sessionStore.patch('a', { status: 'waiting' })
    expect(sessionStore.get()[0]!.waitingSinceMs).toBe(5_000)

    sessionStore.patch('a', { status: 'working' })
    expect(sessionStore.get()[0]!.waitingSinceMs).toBeUndefined()
    vi.useRealTimers()
  })

  it('uses the wait time the caller gave', () => {
    sessionStore.open(session('a'))
    sessionStore.patch('a', { status: 'waiting', waitingSinceMs: 42 })
    expect(sessionStore.get()[0]!.waitingSinceMs).toBe(42)
  })

  it('does not throw when patching an id it does not have', () => {
    expect(() => sessionStore.patch('nope', { tokens: 1 })).not.toThrow()
  })

  it('never lets the stream grow past its cap', () => {
    sessionStore.open(session('a'))
    for (let i = 0; i < STREAM_BUFFER + 25; i += 1) {
      sessionStore.beginCall('a', { id: `c${i}`, line: `line ${i}` })
    }
    const { stream } = sessionStore.get()[0]!
    expect(stream).toHaveLength(STREAM_BUFFER)
    expect(stream.at(-1)!.line).toBe(`line ${STREAM_BUFFER + 24}`)
  })

  it('tells subscribers about a change', () => {
    const listener = vi.fn()
    const unsubscribe = sessionStore.subscribe(listener)
    sessionStore.open(session('a'))
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('hands back the same array when nothing changed and a new one when something did', () => {
    const before = sessionStore.get()
    expect(sessionStore.get()).toBe(before)

    sessionStore.open(session('a'))
    const afterOpen = sessionStore.get()
    expect(afterOpen).not.toBe(before)

    sessionStore.patch('a', { tokens: 7 })
    const afterPatch = sessionStore.get()
    expect(afterPatch).not.toBe(afterOpen)

    sessionStore.beginCall('a', { id: 'c1', line: 'line' })
    expect(sessionStore.get()).not.toBe(afterPatch)
  })

  it('leaves the array alone for an id it does not have, so nothing rerenders for nothing', () => {
    sessionStore.open(session('a'))
    const before = sessionStore.get()
    sessionStore.patch('nope', { tokens: 1 })
    sessionStore.beginCall('nope', { id: 'c1', line: 'line' })
    sessionStore.endCall('nope', 'c1', { failed: false, note: '' })
    expect(sessionStore.get()).toBe(before)
  })
})

describe('sessionStore: the full transcript of a child', () => {
  it('stacks in the order things were said', () => {
    sessionStore.open(session('a'))
    sessionStore.appendTranscript('a', { role: 'user', text: '테스트 고쳐줘' })
    sessionStore.appendTranscript('a', { role: 'assistant', text: '어느 테스트인가요?' })
    expect(sessionStore.get()[0]!.transcript).toEqual([
      { role: 'user', text: '테스트 고쳐줘' },
      { role: 'assistant', text: '어느 테스트인가요?' },
    ])
  })

  it('caps the transcript by dropping from the front', () => {
    sessionStore.open(session('a'))
    for (let i = 0; i < TRANSCRIPT_BUFFER + 5; i += 1) {
      sessionStore.appendTranscript('a', { role: 'assistant', text: `말 ${i}` })
    }
    const transcript = sessionStore.get()[0]!.transcript
    expect(transcript).toHaveLength(TRANSCRIPT_BUFFER)
    expect(transcript.at(-1)!.text).toBe(`말 ${TRANSCRIPT_BUFFER + 4}`)
  })

  it('does not throw when adding to an id it does not have', () => {
    expect(() =>
      sessionStore.appendTranscript('nope', { role: 'user', text: 'x' }),
    ).not.toThrow()
  })
})

describe('sessionStore.clear', () => {
  it('forgets every agent, because a new conversation has a new team', () => {
    sessionStore.open(session('a'))
    sessionStore.open(session('b'))
    sessionStore.clear()
    expect(sessionStore.get()).toEqual([])
  })

  it('keeps an agent the deck has closed, so a later message can reopen it', () => {
    sessionStore.open(session('a'))
    sessionStore.patch('a', { status: 'done' })
    expect(sessionStore.find('a')?.status).toBe('done')
  })
})

describe('sessionStore: closing the right call when an id comes round again', () => {
  it('closes the newest call bearing that id, not the one it replaced', () => {
    sessionStore.open(session('a'))
    sessionStore.beginCall('a', { id: 'Read-0', line: 'Read one.ts' })
    sessionStore.endCall('a', 'Read-0', { failed: false, note: 'first' })
    sessionStore.beginCall('a', { id: 'Read-0', line: 'Read two.ts' })
    sessionStore.endCall('a', 'Read-0', { failed: true, note: 'second' })

    const [older, newer] = sessionStore.get()[0]!.stream
    expect(older!.note).toBe('first')
    expect(older!.failed).toBe(false)
    expect(newer!.note).toBe('second')
    expect(newer!.failed).toBe(true)
  })

  it('says nothing about a call id it has never opened', () => {
    sessionStore.open(session('a'))
    expect(() => sessionStore.endCall('a', 'nope', { failed: false, note: '' })).not.toThrow()
    expect(sessionStore.get()[0]!.stream).toHaveLength(0)
  })
})

describe('sessionStore: closing the right call when an id comes round again', () => {
  it('closes the newest call bearing that id, not the one it replaced', () => {
    sessionStore.open(session('a'))
    sessionStore.beginCall('a', { id: 'Read-0', line: 'Read one.ts' })
    sessionStore.endCall('a', 'Read-0', { failed: false, note: 'first' })
    sessionStore.beginCall('a', { id: 'Read-0', line: 'Read two.ts' })
    sessionStore.endCall('a', 'Read-0', { failed: true, note: 'second' })

    const [older, newer] = sessionStore.get()[0]!.stream
    expect(older!.note).toBe('first')
    expect(newer!.note).toBe('second')
    expect(newer!.failed).toBe(true)
  })

  it('says nothing about a call id it has never opened', () => {
    sessionStore.open(session('a'))
    expect(() => sessionStore.endCall('a', 'nope', { failed: false, note: '' })).not.toThrow()
    expect(sessionStore.get()[0]!.stream).toHaveLength(0)
  })
})
