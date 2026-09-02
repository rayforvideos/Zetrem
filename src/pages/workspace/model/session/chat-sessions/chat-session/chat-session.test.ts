import { describe, expect, it } from 'vitest'
import type { RunConfig } from '@/entities/claude-cli'
import type { Transcript } from '@/entities/conversation'
import { createChatSession } from './chat-session'
import type { ChatSessionDeps } from './chat-session.types'

type Spied = ChatSessionDeps & {
  started: string[]
  stopped: string[]
  written: Transcript[]
  answered: { id: string; requestId: string }[]
}

function fakeDeps(): Spied {
  const started: string[] = []
  const stopped: string[] = []
  const written: Transcript[] = []
  const answered: { id: string; requestId: string }[] = []
  return {
    started,
    stopped,
    written,
    answered,
    startAgent: async (id) => {
      started.push(id)
    },
    sendToAgent: () => {},
    stopAgent: (id) => {
      stopped.push(id)
    },
    respondPermission: (id, requestId) => {
      answered.push({ id, requestId })
    },
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

function line(turn: object): string {
  return JSON.stringify(turn)
}

function said(text: string): string {
  return line({ type: 'assistant', message: { content: [{ type: 'text', text }] } })
}

function asked(requestId: string): string {
  return line({
    type: 'control_request',
    request_id: requestId,
    request: {
      subtype: 'can_use_tool',
      tool_name: 'Bash',
      input: { command: 'ls' },
    },
  })
}

function running(deps: Spied): { session: ReturnType<typeof createChatSession>; id: string } {
  const session = createChatSession('c1', 'p1', deps)
  session.configure(config, () => {})
  session.send('첫 마디', null, [])
  return { session, id: deps.started[0] as string }
}

describe('createChatSession: one chat, its own process and stores', () => {
  it('starts a process on the first message and owns its id', async () => {
    const deps = fakeDeps()
    const { session, id } = running(deps)
    await Promise.resolve()
    expect(deps.started).toHaveLength(1)
    expect(session.owns(id)).toBe(true)
    expect(session.running()).toBe(true)
    expect(session.stores.conversation.get().status).toBe('working')
    expect(session.live()).toBe('working')
  })

  it('applies lines addressed to it and ignores the rest', async () => {
    const deps = fakeDeps()
    const { session, id } = running(deps)
    await Promise.resolve()
    session.handle({ id: 'someone-else', kind: 'line', line: said('남의 말') })
    session.handle({ id, kind: 'line', line: said('내 말') })
    const texts = session.stores.conversation.get().turns.map((turn) => turn.text + turn.draft)
    expect(texts.join(' ')).toContain('내 말')
    expect(texts.join(' ')).not.toContain('남의 말')
  })

  it('closes on exit and stops running', async () => {
    const deps = fakeDeps()
    const { session, id } = running(deps)
    await Promise.resolve()
    session.handle({ id, kind: 'exit', code: 0, reason: null })
    expect(session.running()).toBe(false)
    expect(session.stores.conversation.get().status).toBe('done')
  })

  it('saves by itself once a turn settles, under its own project', async () => {
    const deps = fakeDeps()
    const { session, id } = running(deps)
    await Promise.resolve()
    expect(deps.written).toHaveLength(0)
    session.handle({ id, kind: 'exit', code: 0, reason: null })
    await Promise.resolve()
    expect(deps.written).toHaveLength(1)
    expect(deps.written[0]?.id).toBe('c1')
    expect(session.project).toBe('p1')
  })

  it('reset stops the process and clears the screen', async () => {
    const deps = fakeDeps()
    const { session, id } = running(deps)
    await Promise.resolve()
    session.reset()
    expect(deps.stopped).toEqual([id])
    expect(session.running()).toBe(false)
  })

  it('does not rewrite a chat it has only just read from disk', async () => {
    const deps = fakeDeps()
    const session = createChatSession('c1', 'p1', deps)
    session.restore({
      id: 'c1',
      title: '',
      folder: '',
      sessionId: 'sess-9',
      savedAtMs: 1,
      spend: null,
      turns: [
        {
          id: 't1',
          role: 'user',
          text: '예전에 한 말',
          tools: [],
          draft: '',
          thinking: '',
          startedAtMs: 1,
        },
      ],
    })
    await Promise.resolve()
    expect(deps.written).toHaveLength(0)
    expect(session.thread()).toBe('sess-9')
  })

  it('keeps receiving a permission ask while nobody is looking, and answers it', async () => {
    const deps = fakeDeps()
    const { session, id } = running(deps)
    await Promise.resolve()
    session.handle({ id, kind: 'line', line: asked('req-1') })
    expect(session.stores.conversation.get().permission?.requestId).toBe('req-1')
    expect(session.live()).toBe('asking')
    session.decide(true)
    expect(deps.answered).toEqual([{ id, requestId: 'req-1' }])
    expect(session.stores.conversation.get().permission).toBeNull()
  })

  it('starts a new conversation when the one it resumed never spoke', async () => {
    const deps = fakeDeps()
    const session = createChatSession('c1', 'p1', deps)
    session.configure(config, () => {})
    session.restore({
      id: 'c1',
      title: '',
      folder: '',
      sessionId: 'sess-9',
      savedAtMs: 1,
      spend: null,
      turns: [],
    })
    session.send('다시 이어서', null, [])
    await Promise.resolve()
    session.handle({ id: deps.started[0] as string, kind: 'exit', code: 1, reason: null })
    expect(deps.started).toHaveLength(2)
    expect(session.running()).toBe(true)
    const texts = session.stores.conversation.get().turns.map((turn) => turn.text)
    expect(texts.some((text) => text.length > 0)).toBe(true)
  })

  it('learns the session id the live run reports and resumes with it', async () => {
    const deps = fakeDeps()
    const { session, id } = running(deps)
    await Promise.resolve()
    session.handle({
      id,
      kind: 'line',
      line: line({ type: 'system', subtype: 'init', session_id: 'sess-live', cwd: '/w' }),
    })
    expect(session.thread()).toBe('sess-live')
  })

  it('keep writes what is on screen even mid-reply', async () => {
    const deps = fakeDeps()
    const { session } = running(deps)
    await Promise.resolve()
    expect(deps.written).toHaveLength(0)
    session.keep()
    expect(deps.written).toHaveLength(1)
  })

  it('says nothing to disk for a chat with no turns', () => {
    const deps = fakeDeps()
    const session = createChatSession('c1', 'p1', deps)
    session.keep()
    expect(deps.written).toHaveLength(0)
  })
})
