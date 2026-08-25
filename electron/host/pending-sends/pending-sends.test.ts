import { describe, expect, it } from 'vitest'
import { dropSends, holdSend, releaseSends } from './pending-sends'
import type { PendingSend } from './pending-sends.types'

describe('pendingSends: messages typed while an agent is starting', () => {
  it('keeps a message that arrived before the agent was there', () => {
    const held = new Map<string, PendingSend[]>()
    holdSend(held, 'a', { text: 'hello', files: [] })
    expect(releaseSends(held, 'a')).toEqual([{ text: 'hello', files: [] }])
  })

  it('hands the messages back in the order they were typed', () => {
    const held = new Map<string, PendingSend[]>()
    holdSend(held, 'a', { text: 'first', files: [] })
    holdSend(held, 'a', { text: 'second', files: [] })
    holdSend(held, 'a', { text: 'third', files: [] })
    expect(releaseSends(held, 'a').map((send) => send.text)).toEqual(['first', 'second', 'third'])
  })

  it('carries the files along with the text', () => {
    const held = new Map<string, PendingSend[]>()
    const files = [{ mediaType: 'image/png', data: 'AAA' }]
    holdSend(held, 'a', { text: 'look', files })
    expect(releaseSends(held, 'a')[0]?.files).toBe(files)
  })

  it('holds each agent apart from the others', () => {
    const held = new Map<string, PendingSend[]>()
    holdSend(held, 'a', { text: 'for a', files: [] })
    holdSend(held, 'b', { text: 'for b', files: [] })
    expect(releaseSends(held, 'a').map((send) => send.text)).toEqual(['for a'])
    expect(releaseSends(held, 'b').map((send) => send.text)).toEqual(['for b'])
  })

  it('gives nothing for an agent nobody wrote to', () => {
    expect(releaseSends(new Map(), 'a')).toEqual([])
  })

  it('gives a message out only once', () => {
    const held = new Map<string, PendingSend[]>()
    holdSend(held, 'a', { text: 'hello', files: [] })
    releaseSends(held, 'a')
    expect(releaseSends(held, 'a')).toEqual([])
    expect(held.has('a')).toBe(false)
  })

  it('forgets the messages of a start that was abandoned', () => {
    const held = new Map<string, PendingSend[]>()
    holdSend(held, 'a', { text: 'hello', files: [] })
    dropSends(held, 'a')
    expect(releaseSends(held, 'a')).toEqual([])
  })

  it('leaves the other agents alone when one start is abandoned', () => {
    const held = new Map<string, PendingSend[]>()
    holdSend(held, 'a', { text: 'for a', files: [] })
    holdSend(held, 'b', { text: 'for b', files: [] })
    dropSends(held, 'a')
    expect(releaseSends(held, 'b').map((send) => send.text)).toEqual(['for b'])
  })
})
