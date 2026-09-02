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

function billed(): string {
  return JSON.stringify({
    type: 'result',
    subtype: 'success',
    total_cost_usd: 0.5,
    num_turns: 2,
    duration_ms: 1000,
    usage: { input_tokens: 10, output_tokens: 20 },
  })
}

// A write is a promise chained onto a promise: one tick is not enough to see
// it land, and nothing here waits on real time.
async function settle(): Promise<void> {
  for (let round = 0; round < 5; round += 1) await Promise.resolve()
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

  it('opening another chat leaves the first one running, with no notice', async () => {
    const deps = fakeDeps()
    chatSessions.attach(deps)
    const a = chatSessions.open('a', 'p')
    a.configure(config as never, () => {})
    a.send('길게 답해줘', null, [])
    await Promise.resolve()
    chatSessions.open('b', 'p')
    chatSessions.release('a')
    expect(deps.stopped).toHaveLength(0)
    expect(a.running()).toBe(true)
    expect(a.stores.conversation.get().turns.some((t) => t.role === 'system')).toBe(false)
  })
})

describe('forgetting a chat leaves nothing behind that could write it back', () => {
  it('cancels the save the reset would otherwise have scheduled', async () => {
    const deps = fakeDeps()
    chatSessions.attach(deps)
    const a = chatSessions.open('a', 'p')
    a.configure(config, () => {})
    a.send('가자', null, [])
    await Promise.resolve()
    chatSessions.handle({ id: deps.started[0] as string, kind: 'line', line: said('답') })
    // What a chat looks like once a turn has been paid for: the spend the reset
    // clears is what makes the pack after it differ from the pack before.
    chatSessions.handle({ id: deps.started[0] as string, kind: 'line', line: billed() })
    await settle()
    chatSessions.forget('a')
    const afterForget = deps.written.length
    await settle()
    expect(deps.written).toHaveLength(afterForget)
  })
})

describe('the registry says when a chat has been written back', () => {
  it('names the chat and the project its save went to', async () => {
    const deps = fakeDeps()
    chatSessions.attach(deps)
    const saved: string[] = []
    const stop = chatSessions.onSaved((id, project) => saved.push(`${id}@${project}`))
    const a = chatSessions.open('a', 'p')
    a.configure(config, () => {})
    a.send('가자', null, [])
    await Promise.resolve()
    chatSessions.handle({ id: deps.started[0] as string, kind: 'exit', code: 0, reason: null })
    await settle()
    expect(saved).toEqual(['a@p'])
    stop()
  })

  it('lets a listener go', async () => {
    const deps = fakeDeps()
    chatSessions.attach(deps)
    const saved: string[] = []
    chatSessions.onSaved((id) => saved.push(id))()
    const a = chatSessions.open('a', 'p')
    a.configure(config, () => {})
    a.send('가자', null, [])
    await Promise.resolve()
    chatSessions.handle({ id: deps.started[0] as string, kind: 'exit', code: 0, reason: null })
    await settle()
    expect(saved).toEqual([])
  })
})

describe('the registry remembers which chat each project was left on', () => {
  it('hands back the last chat opened in that project', () => {
    const deps = fakeDeps()
    chatSessions.attach(deps)
    chatSessions.opened('a', 'p')
    chatSessions.opened('b', 'q')
    chatSessions.opened('c', 'p')
    expect(chatSessions.lastOpened('p')).toBe('c')
    expect(chatSessions.lastOpened('q')).toBe('b')
    expect(chatSessions.lastOpened('r')).toBeNull()
  })

  it('forgets a chat the person removed rather than reopening it', () => {
    const deps = fakeDeps()
    chatSessions.attach(deps)
    chatSessions.open('a', 'p')
    chatSessions.opened('a', 'p')
    chatSessions.forget('a')
    expect(chatSessions.lastOpened('p')).toBeNull()
  })
})

describe('a session goes once its process has exited and its last save is written', () => {
  it('drops the chat nobody is on and keeps the one on screen', async () => {
    const deps = fakeDeps()
    chatSessions.attach(deps)
    chatSessions.opened('a', 'p')
    const a = chatSessions.open('a', 'p')
    const b = chatSessions.open('b', 'p')
    a.configure(config, () => {})
    b.configure(config, () => {})
    a.send('가자', null, [])
    b.send('가자', null, [])
    await Promise.resolve()
    const [ida, idb] = deps.started
    chatSessions.handle({ id: ida as string, kind: 'exit', code: 0, reason: null })
    chatSessions.handle({ id: idb as string, kind: 'exit', code: 0, reason: null })
    await settle()
    expect(chatSessions.find('b')).toBeNull()
    expect(chatSessions.find('a')).toBe(a)
  })

  it('keeps a chat that is still running after a save', async () => {
    const deps = fakeDeps()
    chatSessions.attach(deps)
    const b = chatSessions.open('b', 'p')
    b.configure(config, () => {})
    b.send('가자', null, [])
    await Promise.resolve()
    b.keep()
    await settle()
    expect(chatSessions.find('b')).toBe(b)
  })
})
