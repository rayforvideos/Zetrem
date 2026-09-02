import { beforeEach, describe, expect, it } from 'vitest'
import type { RunConfig } from '@/entities/claude-cli'
import type { Transcript } from '@/entities/conversation'
import { chatSessions } from './chat-sessions'
import type { ChatSessionDeps } from './chat-session/chat-session.types'

type Spied = ChatSessionDeps & { started: string[]; stopped: string[]; written: Transcript[] }

function fakeDeps(): Spied {
  const started: string[] = []
  const stopped: string[] = []
  const written: Transcript[] = []
  return {
    started,
    stopped,
    written,
    startAgent: async (id) => {
      started.push(id)
    },
    sendToAgent: () => {},
    stopAgent: (id) => {
      stopped.push(id)
    },
    respondPermission: () => {},
    writeTranscript: async (_project, packed) => {
      written.push(packed)
    },
    onSaveTrouble: () => {},
  }
}

const config: Omit<RunConfig, 'persona' | 'resume'> = {
  permissionMode: 'ask',
  model: 'sonnet',
  effort: 'medium',
  people: [],
  lock: null,
}

function said(text: string): string {
  return JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text }] } })
}

beforeEach(() => chatSessions.clear())

describe('chatSessions: every chat keeps its own process', () => {
  it('routes each event to the session that started it', async () => {
    const deps = fakeDeps()
    chatSessions.attach(deps)
    const a = chatSessions.open('a', 'p')
    const b = chatSessions.open('b', 'p')
    a.configure(config, () => {})
    b.configure(config, () => {})
    a.send('a에게', null, [])
    b.send('b에게', null, [])
    await Promise.resolve()
    const [ida, idb] = deps.started
    expect(ida).not.toBe(idb)
    chatSessions.handle({ id: ida as string, kind: 'exit', code: 0, reason: null })
    expect(a.running()).toBe(false)
    expect(b.running()).toBe(true)
    chatSessions.handle({ id: idb as string, kind: 'exit', code: 0, reason: null })
    expect(b.running()).toBe(false)
  })

  it('lets a chat nobody is looking at go on collecting its reply', async () => {
    const deps = fakeDeps()
    chatSessions.attach(deps)
    const a = chatSessions.open('a', 'p')
    const b = chatSessions.open('b', 'p')
    a.configure(config, () => {})
    b.configure(config, () => {})
    a.send('a에게', null, [])
    b.send('b에게', null, [])
    await Promise.resolve()
    chatSessions.handle({ id: deps.started[1] as string, kind: 'line', line: said('b의 대답') })
    const heard = b.stores.conversation
      .get()
      .turns.map((turn) => turn.text)
      .join(' ')
    expect(heard).toContain('b의 대답')
    expect(
      a.stores.conversation
        .get()
        .turns.map((turn) => turn.text)
        .join(' '),
    ).not.toContain('b의 대답')
  })

  it('reports which chats are working', () => {
    const deps = fakeDeps()
    chatSessions.attach(deps)
    const a = chatSessions.open('a', 'p')
    a.configure(config, () => {})
    a.send('가자', null, [])
    expect(chatSessions.live()).toEqual({ a: 'working' })
  })

  it('hands back the same live map until something about it changes', () => {
    const deps = fakeDeps()
    chatSessions.attach(deps)
    const a = chatSessions.open('a', 'p')
    a.configure(config, () => {})
    a.send('가자', null, [])
    const first = chatSessions.live()
    expect(chatSessions.live()).toBe(first)
  })

  it('release keeps a working session and drops an idle one', () => {
    const deps = fakeDeps()
    chatSessions.attach(deps)
    const a = chatSessions.open('a', 'p')
    a.configure(config, () => {})
    a.send('가자', null, [])
    chatSessions.open('b', 'p')
    chatSessions.release('a')
    chatSessions.release('b')
    expect(chatSessions.find('a')).toBe(a)
    expect(chatSessions.find('b')).toBeNull()
  })

  it('open hands back the session a chat already has', () => {
    const deps = fakeDeps()
    chatSessions.attach(deps)
    const a = chatSessions.open('a', 'p')
    expect(chatSessions.open('a', 'p')).toBe(a)
  })

  it('forget stops a chat the person asked to remove', async () => {
    const deps = fakeDeps()
    chatSessions.attach(deps)
    const a = chatSessions.open('a', 'p')
    a.configure(config, () => {})
    a.send('가자', null, [])
    await Promise.resolve()
    chatSessions.forget('a')
    expect(deps.stopped).toHaveLength(1)
    expect(deps.written).toHaveLength(1)
    expect(chatSessions.find('a')).toBeNull()
  })

  it('stopAll stops everything and says why in each chat', async () => {
    const deps = fakeDeps()
    chatSessions.attach(deps)
    const a = chatSessions.open('a', 'p')
    a.configure(config, () => {})
    a.send('가자', null, [])
    await Promise.resolve()
    chatSessions.stopAll('계정이 바뀌었습니다')
    expect(deps.stopped).toHaveLength(1)
    expect(a.stores.conversation.get().turns.at(-1)?.text).toBe('계정이 바뀌었습니다')
    expect(a.stores.status.get().session).toBeNull()
  })

  it('tells whoever is watching when a chat starts working', () => {
    const deps = fakeDeps()
    chatSessions.attach(deps)
    let told = 0
    const stop = chatSessions.subscribe(() => {
      told += 1
    })
    const a = chatSessions.open('a', 'p')
    expect(told).toBeGreaterThan(0)
    const afterOpen = told
    a.configure(config, () => {})
    a.send('가자', null, [])
    expect(told).toBeGreaterThan(afterOpen)
    stop()
  })
})
