import { describe, expect, it } from 'vitest'
import type { ClaudeTurnEvent } from '@/entities/claude-cli'
import { stirred } from './stirred'

const words: ClaudeTurnEvent = { type: 'delta', text: 'hello' }
const tool: ClaudeTurnEvent = { type: 'stream', line: 'Read a.ts', toolUseId: 't', input: null }
const ended: ClaudeTurnEvent = { type: 'turnEnded' }
const woke: ClaudeTurnEvent = {
  type: 'session',
  session: {
    id: 's1',
    cwd: '/w',
    model: 'sonnet',
    permissionMode: 'default',
    cliVersion: '2.0.0',
    mcp: [],
    tools: [],
    agents: [],
  },
}

describe('stirred: the session woke up on its own', () => {
  it('counts words arriving after a turn ended as work starting again', () => {
    expect(stirred(words, { status: 'done', asked: false })).toBe(true)
    expect(stirred(tool, { status: 'done', asked: false })).toBe(true)
  })

  it('says nothing about a session already known to be working', () => {
    expect(stirred(words, { status: 'working', asked: false })).toBe(false)
  })

  it('takes words after a turn has ended as work again, since that is the session waking itself', () => {
    expect(stirred(words, { status: 'waiting', asked: false })).toBe(true)
  })

  it('leaves a session that is asking you something alone', () => {
    expect(stirred(words, { status: 'waiting', asked: true })).toBe(false)
  })

  it('does not take the end of a turn as the start of one', () => {
    expect(stirred(ended, { status: 'done', asked: false })).toBe(false)
  })

  it('counts a turn opening as work, since the answer can be a minute of silence away', () => {
    expect(stirred(woke, { status: 'waiting', asked: false })).toBe(true)
    expect(stirred(woke, { status: 'done', asked: false })).toBe(true)
  })

  it('still leaves the session alone while it is asking you something', () => {
    expect(stirred(woke, { status: 'waiting', asked: true })).toBe(false)
  })
})
