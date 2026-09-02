import { describe, expect, it } from 'vitest'
import { createChatStatus, createSessionStore } from '@/entities/agent-session'
import type { AgentSession } from '@/entities/agent-session'
import type { ExitReason } from '@/entities/claude-cli'
import { createConversation } from '../../chat/conversation/conversation'
import type { AgentEventRefs } from '../agent-events/agent-events.types'
import { freshRefs } from '../agent-events/refs/refs'
import { beginSession, closeSession } from './session-bookkeeping'

function fakeRefs(): AgentEventRefs {
  return freshRefs(
    {
      conversation: createConversation(),
      status: createChatStatus(),
      children: createSessionStore(),
    },
    { onModelRefused: () => {}, onLimit: () => {} },
  )
}

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

describe('closeSession: what the exit leaves behind', () => {
  it('drops an ask nobody can answer any more, card and queue alike', () => {
    const refs = fakeRefs()
    refs.asks.push(ask('req-1'), ask('req-2'))
    refs.stores.conversation.setPermission({
      requestId: 'req-1',
      toolName: 'Bash',
      line: 'rm -rf /',
      detail: '',
    })

    closeSession(refs, { reason: null, stopped: true })

    expect(refs.asks, 'nobody can answer a session that has gone').toEqual([])
    expect(refs.stores.conversation.get().permission).toBeNull()
    expect(refs.stores.conversation.get().status).toBe('done')
  })

  it('calls a crash trouble, and says what happened', () => {
    const refs = fakeRefs()
    closeSession(refs, { reason: crashed, stopped: false })

    expect(refs.stores.conversation.get().trouble).toBe(true)
    expect(refs.stores.conversation.get().turns.at(-1)?.text).toContain('the CLI fell over')
  })

  it('does not call a stop you asked for trouble', () => {
    const refs = fakeRefs()
    closeSession(refs, { reason: crashed, stopped: true })

    expect(refs.stores.conversation.get().trouble, 'a stop you asked for is not trouble').toBe(
      false,
    )
    expect(refs.stores.conversation.get().turns.at(-1)?.text).toContain('the CLI fell over')
  })

  it('says nothing when the exit had nothing to report', () => {
    const refs = fakeRefs()
    closeSession(refs, { reason: null, stopped: false })

    expect(refs.stores.conversation.get().turns).toEqual([])
    expect(refs.stores.conversation.get().trouble).toBe(false)
  })

  it('stops the clock, finishes the children, and clears the chores', () => {
    const refs = fakeRefs()
    refs.stores.status.apply({ type: 'activity', activity: 'requesting' })
    refs.stores.children.open(child('a'))
    refs.stores.children.open(child('b'))
    refs.stores.conversation.startChore('chore-1', 'watching the build')
    refs.childIds.add('a')

    closeSession(refs, { reason: null, stopped: true })

    expect(refs.stores.status.get().activity).toBe('idle')
    expect(refs.stores.children.find('a')?.status).toBe('done')
    expect(
      refs.stores.children.find('b')?.status,
      'only the children this session sent out are ended',
    ).toBe('working')
    expect(refs.childIds.size).toBe(0)
    expect(refs.stores.conversation.get().chores).toEqual([])
  })

  it('settles a half-written turn before the exit line lands after it', () => {
    const refs = fakeRefs()
    refs.stores.conversation.delta('halfway through a thought')

    closeSession(refs, { reason: crashed, stopped: false })

    const turns = refs.stores.conversation.get().turns
    expect(turns[0]?.text).toBe('halfway through a thought')
    expect(turns[0]?.draft).toBe('')
    expect(turns[1]?.role, 'what was being said settles first, then the exit line').toBe('system')
  })
})

describe('beginSession: the slate the next run starts on', () => {
  it('clears everything the last run left in the refs', () => {
    const refs = fakeRefs()
    refs.asks.push(ask('req-1'))
    refs.sends.set('tool-1', { to: 'agent-a', message: '이어서 부탁해' })
    refs.childIds.add('a')
    refs.limits.set('seven_day', 'allowed_warning 1787173200000 false')
    refs.stores.children.open(child('a'))

    beginSession(refs, false)

    expect(refs.asks).toEqual([])
    expect(refs.sends.size).toBe(0)
    expect(refs.childIds.size).toBe(0)
    expect(refs.limits.size).toBe(0)
    expect(refs.stores.children.get()).toEqual([])
  })

  it('clears a chore the dead session never got to finish', () => {
    // A killed CLI takes its background commands with it, but never sends
    // task_updated. The relaunch path skips closeSession, so the new session
    // must not inherit a banner ticking over a process that no longer exists.
    const refs = fakeRefs()
    refs.stores.conversation.startChore('chore-1', 'Run coverage and i18n catalog check')

    beginSession(refs, true)

    expect(refs.stores.conversation.get().chores).toEqual([])
  })

  it('starts working with no trouble showing', () => {
    const refs = fakeRefs()
    refs.stores.conversation.setTrouble(true)

    beginSession(refs, false)

    expect(refs.stores.conversation.get().status).toBe('working')
    expect(
      refs.stores.conversation.get().trouble,
      "yesterday's trouble does not follow a new conversation",
    ).toBe(false)
  })

  it('keeps what the chat already cost when it is being resumed', () => {
    const refs = fakeRefs()
    refs.stores.status.restoreChat({ usd: 0.58 })

    beginSession(refs, true)

    expect(refs.stores.status.get().cost.usd).toBe(0.58)
  })

  it('starts a fresh chat from nothing', () => {
    const refs = fakeRefs()
    refs.stores.status.restoreChat({ usd: 0.58 })

    beginSession(refs, false)

    expect(refs.stores.status.get().cost.usd).toBe(0)
  })
})
