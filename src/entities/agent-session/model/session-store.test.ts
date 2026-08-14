import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STREAM_BUFFER, TRANSCRIPT_BUFFER } from './session'
import type { AgentSession } from './session'
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
  it('연 순서대로 세션을 유지한다', () => {
    sessionStore.open(session('a'))
    sessionStore.open(session('b'))
    expect(sessionStore.get().map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('일부 필드만 갱신한다', () => {
    sessionStore.open(session('a'))
    sessionStore.patch('a', { status: 'done', tokens: 120 })
    const found = sessionStore.get()[0]!
    expect(found.status).toBe('done')
    expect(found.tokens).toBe(120)
    expect(found.label).toBe('에이전트 a')
  })

  it('대기로 들어간 시각을 찍고, 나오면 지운다 — 시선의 주인을 가릴 근거다 (스펙 §6)', () => {
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

  it('호출자가 대기 시각을 명시하면 그것을 쓴다', () => {
    sessionStore.open(session('a'))
    sessionStore.patch('a', { status: 'waiting', waitingSinceMs: 42 })
    expect(sessionStore.get()[0]!.waitingSinceMs).toBe(42)
  })

  it('없는 id 를 갱신해도 던지지 않는다', () => {
    expect(() => sessionStore.patch('nope', { tokens: 1 })).not.toThrow()
  })

  it('스트림 버퍼가 상한을 넘지 않는다', () => {
    sessionStore.open(session('a'))
    for (let i = 0; i < STREAM_BUFFER + 25; i += 1) sessionStore.pushStream('a', `line ${i}`)
    const { stream } = sessionStore.get()[0]!
    expect(stream).toHaveLength(STREAM_BUFFER)
    expect(stream.at(-1)).toBe(`line ${STREAM_BUFFER + 24}`)
  })

  it('구독자에게 변화를 알린다', () => {
    const listener = vi.fn()
    const unsubscribe = sessionStore.subscribe(listener)
    sessionStore.open(session('a'))
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('변화가 없으면 같은 참조, 변화가 있으면 새 참조 — useSyncExternalStore 가 이걸로 판정한다', () => {
    const before = sessionStore.get()
    expect(sessionStore.get()).toBe(before)

    sessionStore.open(session('a'))
    const afterOpen = sessionStore.get()
    expect(afterOpen).not.toBe(before)

    sessionStore.patch('a', { tokens: 7 })
    const afterPatch = sessionStore.get()
    expect(afterPatch).not.toBe(afterOpen)

    sessionStore.pushStream('a', 'line')
    expect(sessionStore.get()).not.toBe(afterPatch)
  })

  it('없는 id 를 갱신하면 참조가 그대로다 — 헛 재렌더를 만들지 않는다', () => {
    sessionStore.open(session('a'))
    const before = sessionStore.get()
    sessionStore.patch('nope', { tokens: 1 })
    sessionStore.pushStream('nope', 'line')
    expect(sessionStore.get()).toBe(before)
  })
})

describe('sessionStore — 대화 전문', () => {
  it('말한 순서대로 쌓인다', () => {
    sessionStore.open(session('a'))
    sessionStore.appendTranscript('a', { role: 'user', text: '테스트 고쳐줘' })
    sessionStore.appendTranscript('a', { role: 'assistant', text: '어느 테스트인가요?' })
    expect(sessionStore.get()[0]!.transcript).toEqual([
      { role: 'user', text: '테스트 고쳐줘' },
      { role: 'assistant', text: '어느 테스트인가요?' },
    ])
  })

  it('전문 버퍼가 상한을 넘지 않는다 — 앞에서 버린다', () => {
    sessionStore.open(session('a'))
    for (let i = 0; i < TRANSCRIPT_BUFFER + 5; i += 1) {
      sessionStore.appendTranscript('a', { role: 'assistant', text: `말 ${i}` })
    }
    const transcript = sessionStore.get()[0]!.transcript
    expect(transcript).toHaveLength(TRANSCRIPT_BUFFER)
    expect(transcript.at(-1)!.text).toBe(`말 ${TRANSCRIPT_BUFFER + 4}`)
  })

  it('없는 id 에 전문을 붙여도 던지지 않는다', () => {
    expect(() =>
      sessionStore.appendTranscript('nope', { role: 'user', text: 'x' }),
    ).not.toThrow()
  })
})

describe('sessionStore.remove', () => {
  it('닫힌 타일을 스토어에서 걷어낸다 — 관측기는 오래 켜두는 창이다', () => {
    sessionStore.open(session('a'))
    sessionStore.open(session('b'))
    sessionStore.remove('a')
    expect(sessionStore.get().map((s) => s.id)).toEqual(['b'])
  })

  it('없는 id 를 지워도 던지지 않는다', () => {
    expect(() => sessionStore.remove('nope')).not.toThrow()
  })
})
