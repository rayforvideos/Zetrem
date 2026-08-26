import { beforeEach, describe, expect, it } from 'vitest'
import { sessionStore, statusStore } from '@/entities/agent-session'
import type { AgentSession } from '@/entities/agent-session'
import type { ExitReason } from '@/entities/claude-cli'
import { conversation } from '../../chat/conversation/conversation'
import type { AgentEventRefs } from '../agent-events/agent-events.types'
import { beginSession, closeSession } from './session-bookkeeping'

function ask(requestId: string): AgentEventRefs['asks'][number] {
  return { requestId, toolName: 'Bash', line: 'rm -rf /', detail: '', input: {} }
}

function child(id: string): AgentSession {
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
  }
}

const crashed: ExitReason = { code: 'cli-said', said: 'the CLI fell over' }

beforeEach(() => {
  conversation.reset()
  statusStore.reset()
  sessionStore.clear()
})

describe('closeSession: what the exit leaves behind', () => {
  it('drops an ask nobody can answer any more, card and queue alike', () => {
    const asks = [ask('req-1'), ask('req-2')]
    conversation.setPermission({
      requestId: 'req-1',
      toolName: 'Bash',
      line: 'rm -rf /',
      detail: '',
    })

    closeSession({ reason: null, stopped: true, asks, childIds: new Set() })

    expect(asks, 'nobody can answer a session that has gone').toEqual([])
    expect(conversation.get().permission).toBeNull()
    expect(conversation.get().status).toBe('done')
  })

  it('calls a crash trouble, and says what happened', () => {
    closeSession({ reason: crashed, stopped: false, asks: [], childIds: new Set() })

    expect(conversation.get().trouble).toBe(true)
    expect(conversation.get().turns.at(-1)?.text).toContain('the CLI fell over')
  })

  it('does not call a stop you asked for trouble', () => {
    closeSession({ reason: crashed, stopped: true, asks: [], childIds: new Set() })

    expect(conversation.get().trouble, 'a stop you asked for is not trouble').toBe(false)
    expect(conversation.get().turns.at(-1)?.text).toContain('the CLI fell over')
  })

  it('says nothing when the exit had nothing to report', () => {
    closeSession({ reason: null, stopped: false, asks: [], childIds: new Set() })

    expect(conversation.get().turns).toEqual([])
    expect(conversation.get().trouble).toBe(false)
  })

  it('stops the clock, finishes the children, and clears the chores', () => {
    statusStore.apply({ type: 'activity', activity: 'requesting' })
    sessionStore.open(child('a'))
    sessionStore.open(child('b'))
    conversation.startChore('chore-1', 'watching the build')
    const childIds = new Set(['a'])

    closeSession({ reason: null, stopped: true, asks: [], childIds })

    expect(statusStore.get().activity).toBe('idle')
    expect(sessionStore.find('a')?.status).toBe('done')
    expect(
      sessionStore.find('b')?.status,
      'only the children this session sent out are ended',
    ).toBe('working')
    expect(childIds.size).toBe(0)
    expect(conversation.get().chores).toEqual([])
  })

  it('settles a half-written turn before the exit line lands after it', () => {
    conversation.delta('halfway through a thought')

    closeSession({ reason: crashed, stopped: false, asks: [], childIds: new Set() })

    const turns = conversation.get().turns
    expect(turns[0]?.text).toBe('halfway through a thought')
    expect(turns[0]?.draft).toBe('')
    expect(turns[1]?.role, 'what was being said settles first, then the exit line').toBe('system')
  })
})

describe('beginSession: the slate the next run starts on', () => {
  it('clears everything the last run left in the refs', () => {
    const asks = [ask('req-1')]
    const sends = new Map([['tool-1', { to: 'agent-a', message: '이어서 부탁해' }]])
    const childIds = new Set(['a'])
    sessionStore.open(child('a'))

    beginSession({ resumed: false, asks, sends, childIds })

    expect(asks).toEqual([])
    expect(sends.size).toBe(0)
    expect(childIds.size).toBe(0)
    expect(sessionStore.get()).toEqual([])
  })

  it('starts working with no trouble showing', () => {
    conversation.setTrouble(true)

    beginSession({ resumed: false, asks: [], sends: new Map(), childIds: new Set() })

    expect(conversation.get().status).toBe('working')
    expect(
      conversation.get().trouble,
      "yesterday's trouble does not follow a new conversation",
    ).toBe(false)
  })

  it('keeps what the chat already cost when it is being resumed', () => {
    statusStore.restoreChat({ usd: 0.58 })

    beginSession({ resumed: true, asks: [], sends: new Map(), childIds: new Set() })

    expect(statusStore.get().cost.usd).toBe(0.58)
  })

  it('starts a fresh chat from nothing', () => {
    statusStore.restoreChat({ usd: 0.58 })

    beginSession({ resumed: false, asks: [], sends: new Map(), childIds: new Set() })

    expect(statusStore.get().cost.usd).toBe(0)
  })
})
