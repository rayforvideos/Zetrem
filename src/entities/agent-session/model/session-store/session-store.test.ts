import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STREAM_BUFFER, TRANSCRIPT_BUFFER } from '../session/session'
import type { DiffLine } from '@/entities/tool/@x/agent-session'
import type { AgentSession } from '../session/session.types'
import { createSessionStore } from './session-store'

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

let store = createSessionStore()

beforeEach(() => {
  store = createSessionStore()
})

describe('sessionStore', () => {
  it('keeps sessions in the order they opened', () => {
    store.open(session('a'))
    store.open(session('b'))
    expect(store.get().map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('changes only the fields it was given', () => {
    store.open(session('a'))
    store.patch('a', { status: 'done', tokens: 120 })
    const found = store.get()[0]!
    expect(found.status).toBe('done')
    expect(found.tokens).toBe(120)
    expect(found.label).toBe('에이전트 a')
  })

  it('stamps when the wait began and clears it on the way out, which is how the eye is chosen', () => {
    vi.useFakeTimers()
    vi.setSystemTime(5_000)
    store.open(session('a'))
    expect(store.get()[0]!.waitingSinceMs).toBeUndefined()

    store.patch('a', { status: 'waiting' })
    expect(store.get()[0]!.waitingSinceMs).toBe(5_000)

    vi.setSystemTime(9_000)
    store.patch('a', { status: 'waiting' })
    expect(store.get()[0]!.waitingSinceMs).toBe(5_000)

    store.patch('a', { status: 'working' })
    expect(store.get()[0]!.waitingSinceMs).toBeUndefined()
    vi.useRealTimers()
  })

  it('uses the wait time the caller gave', () => {
    store.open(session('a'))
    store.patch('a', { status: 'waiting', waitingSinceMs: 42 })
    expect(store.get()[0]!.waitingSinceMs).toBe(42)
  })

  it('does not throw when patching an id it does not have', () => {
    expect(() => store.patch('nope', { tokens: 1 })).not.toThrow()
  })

  it('never lets the stream grow past its cap', () => {
    store.open(session('a'))
    for (let i = 0; i < STREAM_BUFFER + 25; i += 1) {
      store.beginCall('a', { id: `c${i}`, line: `line ${i}` })
    }
    const { stream } = store.get()[0]!
    expect(stream).toHaveLength(STREAM_BUFFER)
    expect(stream.at(-1)!.line).toBe(`line ${STREAM_BUFFER + 24}`)
  })

  it('tells subscribers about a change', () => {
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    store.open(session('a'))
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('hands back the same array when nothing changed and a new one when something did', () => {
    const before = store.get()
    expect(store.get()).toBe(before)

    store.open(session('a'))
    const afterOpen = store.get()
    expect(afterOpen).not.toBe(before)

    store.patch('a', { tokens: 7 })
    const afterPatch = store.get()
    expect(afterPatch).not.toBe(afterOpen)

    store.beginCall('a', { id: 'c1', line: 'line' })
    expect(store.get()).not.toBe(afterPatch)
  })

  it('leaves the array alone for an id it does not have, so nothing rerenders for nothing', () => {
    store.open(session('a'))
    const before = store.get()
    store.patch('nope', { tokens: 1 })
    store.beginCall('nope', { id: 'c1', line: 'line' })
    store.endCall('nope', 'c1', { failed: false, note: '' })
    expect(store.get()).toBe(before)
  })
})

describe('sessionStore: the full transcript of a child', () => {
  it('stacks in the order things were said', () => {
    store.open(session('a'))
    store.appendTranscript('a', { role: 'user', text: '테스트 고쳐줘' })
    store.appendTranscript('a', { role: 'assistant', text: '어느 테스트인가요?' })
    expect(store.get()[0]!.transcript).toEqual([
      { role: 'user', text: '테스트 고쳐줘', atMs: expect.any(Number) },
      { role: 'assistant', text: '어느 테스트인가요?', atMs: expect.any(Number) },
    ])
  })

  it('stamps each entry with when it was said, so it can merge with the calls around it', () => {
    vi.useFakeTimers()
    vi.setSystemTime(5_000)
    store.open(session('a'))
    store.appendTranscript('a', { role: 'user', text: '테스트 고쳐줘' })
    vi.setSystemTime(9_000)
    store.appendTranscript('a', { role: 'assistant', text: '어느 테스트인가요?' })
    expect(store.get()[0]!.transcript.map((entry) => entry.atMs)).toEqual([5_000, 9_000])
    vi.useRealTimers()
  })

  it('keeps an explicit atMs instead of overwriting it', () => {
    store.open(session('a'))
    store.appendTranscript('a', { role: 'user', text: '테스트 고쳐줘', atMs: 42 })
    expect(store.get()[0]!.transcript[0]!.atMs).toBe(42)
  })

  it('caps the transcript by dropping from the front', () => {
    store.open(session('a'))
    for (let i = 0; i < TRANSCRIPT_BUFFER + 5; i += 1) {
      store.appendTranscript('a', { role: 'assistant', text: `말 ${i}` })
    }
    const transcript = store.get()[0]!.transcript
    expect(transcript).toHaveLength(TRANSCRIPT_BUFFER)
    expect(transcript.at(-1)!.text).toBe(`말 ${TRANSCRIPT_BUFFER + 4}`)
  })

  it('does not throw when adding to an id it does not have', () => {
    expect(() => store.appendTranscript('nope', { role: 'user', text: 'x' })).not.toThrow()
  })
})

describe('sessionStore.clear', () => {
  it('forgets every agent, because a new conversation has a new team', () => {
    store.open(session('a'))
    store.open(session('b'))
    store.clear()
    expect(store.get()).toEqual([])
  })

  it('keeps an agent the deck has closed, so a later message can reopen it', () => {
    store.open(session('a'))
    store.patch('a', { status: 'done' })
    expect(store.find('a')?.status).toBe('done')
  })
})

describe('sessionStore: closing the right call when an id comes round again', () => {
  it('closes the newest call bearing that id, not the one it replaced', () => {
    store.open(session('a'))
    store.beginCall('a', { id: 'Read-0', line: 'Read one.ts' })
    store.endCall('a', 'Read-0', { failed: false, note: 'first' })
    store.beginCall('a', { id: 'Read-0', line: 'Read two.ts' })
    store.endCall('a', 'Read-0', { failed: true, note: 'second' })

    const [older, newer] = store.get()[0]!.stream
    expect(older!.note).toBe('first')
    expect(older!.failed).toBe(false)
    expect(newer!.note).toBe('second')
    expect(newer!.failed).toBe(true)
  })

  it('says nothing about a call id it has never opened', () => {
    store.open(session('a'))
    expect(() => store.endCall('a', 'nope', { failed: false, note: '' })).not.toThrow()
    expect(store.get()[0]!.stream).toHaveLength(0)
  })
})

describe('sessionStore: closing the right call when an id comes round again', () => {
  it('closes the newest call bearing that id, not the one it replaced', () => {
    store.open(session('a'))
    store.beginCall('a', { id: 'Read-0', line: 'Read one.ts' })
    store.endCall('a', 'Read-0', { failed: false, note: 'first' })
    store.beginCall('a', { id: 'Read-0', line: 'Read two.ts' })
    store.endCall('a', 'Read-0', { failed: true, note: 'second' })

    const [older, newer] = store.get()[0]!.stream
    expect(older!.note).toBe('first')
    expect(newer!.note).toBe('second')
    expect(newer!.failed).toBe(true)
  })

  it('says nothing about a call id it has never opened', () => {
    store.open(session('a'))
    expect(() => store.endCall('a', 'nope', { failed: false, note: '' })).not.toThrow()
    expect(store.get()[0]!.stream).toHaveLength(0)
  })
})

describe('sessionStore: a call keeps the change it made, not the input it made it from', () => {
  const first: DiffLine[][] = [[{ kind: 'add', text: '첫 줄' }]]
  const second: DiffLine[][] = [[{ kind: 'add', text: '둘째 줄' }]]

  it('stores the change given when the call opens', () => {
    store.open(session('a'))
    store.beginCall('a', {
      id: 'c1',
      line: 'Edit a.ts',
      change: first,
      count: { added: 1, removed: 0 },
    })
    const [only] = store.get()
    expect(only?.stream[0]?.change).toEqual(first)
    expect(only?.stream[0]?.count).toEqual({ added: 1, removed: 0 })
  })

  it('keeps the newer change when the same call is announced again', () => {
    store.open(session('a'))
    store.beginCall('a', { id: 'c1', line: 'Edit', change: first })
    store.beginCall('a', { id: 'c1', line: 'Edit a.ts', change: second })
    expect(store.get()[0]?.stream[0]?.change).toEqual(second)
  })

  it('leaves the change it already has when a later word says nothing about it', () => {
    store.open(session('a'))
    store.beginCall('a', { id: 'c1', line: 'Edit', change: first })
    store.beginCall('a', { id: 'c1', line: 'Edit a.ts' })
    expect(store.get()[0]?.stream[0]?.change).toEqual(first)
  })

  it('carries the change onto the row a bare tool name left standing', () => {
    store.open(session('a'))
    store.beginCall('a', { id: 'p1', line: 'Edit' })
    store.endCall('a', 'p1', { failed: false, note: '' })
    store.beginCall('a', { id: 'toolu_1', line: 'Edit a.ts', change: second })
    const stream = store.get()[0]?.stream ?? []
    expect(stream).toHaveLength(1)
    expect(stream[0]?.change).toEqual(second)
  })
})

describe('one call announced twice is one row, not two', () => {
  it('fills in the argument the first announcement did not have yet', () => {
    store.clear()
    store.open(session('a'))
    store.beginCall('a', { id: 'c1', line: 'Bash' })
    store.beginCall('a', { id: 'c1', line: 'Bash npm test' })
    const [only] = store.get()
    expect(only?.stream).toHaveLength(1)
    expect(only?.stream[0]?.line).toBe('Bash npm test')
  })

  it('opens a second row when the same id comes back after the first one closed', () => {
    store.clear()
    store.open(session('a'))
    store.beginCall('a', { id: 'c1', line: 'Bash ls' })
    store.endCall('a', 'c1', { failed: false, note: '2 lines' })
    store.beginCall('a', { id: 'c1', line: 'Bash ls' })
    expect(store.get()[0]?.stream).toHaveLength(2)
  })

  it('keeps the clock of the first announcement, since that is when the call began', () => {
    store.clear()
    store.open(session('a'))
    store.beginCall('a', { id: 'c1', line: 'Bash' })
    const began = store.get()[0]?.stream[0]?.startedAtMs
    store.beginCall('a', { id: 'c1', line: 'Bash npm test' })
    expect(store.get()[0]?.stream[0]?.startedAtMs).toBe(began)
  })
})

describe('a row that only names the tool gives way when the real call arrives', () => {
  it('replaces it rather than drawing the same call twice', () => {
    store.clear()
    store.open(session('a'))
    store.beginCall('a', { id: 'p1', line: 'Bash' })
    store.endCall('a', 'p1', { failed: false, note: '' })
    store.beginCall('a', { id: 'toolu_1', line: 'Bash npm test' })
    const stream = store.get()[0]?.stream ?? []
    expect(stream).toHaveLength(1)
    expect(stream[0]?.line).toBe('Bash npm test')
    expect(stream[0]?.id).toBe('toolu_1')
    expect(stream[0]?.endedAtMs).toBeNull()
  })

  it('leaves a row alone that already said what it did', () => {
    store.clear()
    store.open(session('a'))
    store.beginCall('a', { id: 'c1', line: 'Bash ls' })
    store.endCall('a', 'c1', { failed: false, note: '2 lines' })
    store.beginCall('a', { id: 'c2', line: 'Bash npm test' })
    expect(store.get()[0]?.stream).toHaveLength(2)
  })
})

describe('createSessionStore: one per chat', () => {
  it('keeps children of two chats apart', () => {
    const a = createSessionStore()
    const b = createSessionStore()
    a.open(session('x'))
    expect(a.get()).toHaveLength(1)
    expect(b.get()).toHaveLength(0)
    expect(b.find('x')).toBeNull()
  })
})
