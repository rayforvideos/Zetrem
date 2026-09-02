import { describe, expect, it } from 'vitest'
import type { AgentSession, Call, TranscriptEntry } from '@/entities/agent-session'
import { timelineOf } from './timeline'

function said(text: string, atMs?: number): TranscriptEntry {
  return atMs === undefined ? { role: 'user', text } : { role: 'user', text, atMs }
}

function call(id: string, startedAtMs: number): Call {
  return { id, line: id, startedAtMs, endedAtMs: null, failed: false, note: '' }
}

function session(transcript: TranscriptEntry[], stream: Call[]): AgentSession {
  return { transcript, stream } as AgentSession
}

describe('timelineOf: the said and the done, laid out in the order they happened', () => {
  it('interleaves said entries and calls by when each happened', () => {
    const items = timelineOf(
      session([said('assignment', 100), said('a reply', 300)], [call('c1', 200), call('c2', 400)]),
    )
    expect(items.map((item) => (item.kind === 'said' ? item.entry.text : item.call.id))).toEqual([
      'assignment',
      'c1',
      'a reply',
      'c2',
    ])
  })

  it('puts a said entry ahead of a call that happened at the exact same time', () => {
    const items = timelineOf(session([said('assignment', 100)], [call('c1', 100)]))
    expect(items.map((item) => item.kind)).toEqual(['said', 'call'])
  })

  it('keeps entries without a timestamp in their relative order, ahead of anything timestamped', () => {
    const items = timelineOf(
      session([said('first legacy'), said('second legacy'), said('newer', 50)], [call('c1', 10)]),
    )
    expect(items.map((item) => (item.kind === 'said' ? item.entry.text : item.call.id))).toEqual([
      'first legacy',
      'second legacy',
      'c1',
      'newer',
    ])
  })

  it('is empty for a session with nothing said and nothing done', () => {
    expect(timelineOf(session([], []))).toEqual([])
  })
})
