import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { AgentSession, ChatStatusState } from '@/entities/agent-session'
import type { ModelChoice } from '@/entities/claude-cli'
import type { Attached } from '@/entities/attachment'
import { settled } from './settle/settle'
import type { Conversation, ConversationState } from '../chat/conversation/conversation.types'
import type { ChatRunConfig, ChatSession } from './chat-sessions/chat-session/chat-session.types'

const CLOCK_MS = 1000

// Stable identity: useSyncExternalStore must get the same object back across
// renders while nothing has changed, and there is no session to read from
// when nothing is open.
const EMPTY_CONV: ConversationState = {
  turns: [],
  status: 'done',
  permission: null,
  chores: [],
  trouble: false,
}

const EMPTY_STATUS: ChatStatusState = {
  session: null,
  probed: false,
  context: { used: 0, window: null },
  cost: {
    usd: 0,
    lastTurnUsd: 0,
    tokens: { in: 0, out: 0, cacheRead: 0, cacheCreate: 0 },
    durationMs: 0,
    turns: 0,
  },
  activity: 'idle',
}

const EMPTY_CHILDREN: AgentSession[] = []

type Agent = {
  running: boolean
  conversation: ConversationState
  conversationStore: Conversation | null
  children: AgentSession[]
  status: ChatStatusState
  nowMs: number
  send(text: string, to?: string | null, files?: Attached[]): void
  decide(allow: boolean, always?: boolean): void
  stop(): void
  reset(): void
  restart(): void
}

// A thin subscription over the active chat's session: everything the screen
// shows lives on the session already (Task 6), so this hook does not launch,
// stop or reset anything on its own account — it just reads.
export function useAgent(
  session: ChatSession | null,
  config: ChatRunConfig,
  onModelRefused: (model: ModelChoice) => void,
): Agent {
  const subscribe = useCallback(
    (listener: () => void) => session?.subscribe(listener) ?? (() => undefined),
    [session],
  )
  const conv = useSyncExternalStore(
    subscribe,
    () => session?.stores.conversation.get() ?? EMPTY_CONV,
    () => EMPTY_CONV,
  )
  const children = useSyncExternalStore(
    subscribe,
    () => session?.stores.children.get() ?? EMPTY_CHILDREN,
    () => EMPTY_CHILDREN,
  )
  const status = useSyncExternalStore(
    subscribe,
    () => session?.stores.status.get() ?? EMPTY_STATUS,
    () => EMPTY_STATUS,
  )
  const running = useSyncExternalStore(
    subscribe,
    () => session?.running() ?? false,
    () => false,
  )
  const [nowMs, setNowMs] = useState(() => Date.now())

  // Written after commit, not during render: a render React throws away must
  // not leave its config behind for the session's next launch to pick up.
  useEffect(() => {
    session?.configure(config, onModelRefused)
  })

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), CLOCK_MS)
    return () => clearInterval(timer)
  }, [])

  const convStatus = conv.status
  useEffect(() => {
    if (session === null) return
    const at = { nowMs, parentWorking: convStatus === 'working' }
    for (const id of settled(children, at)) session.stores.children.patch(id, { status: 'done' })
  }, [session, children, nowMs, convStatus])

  return {
    running,
    conversation: conv,
    conversationStore: session?.stores.conversation ?? null,
    children,
    status,
    nowMs,
    send: (text, to = null, files = []) => session?.send(text, to, files),
    decide: (allow, always = false) => session?.decide(allow, always),
    stop: () => session?.stop(),
    reset: () => session?.reset(),
    restart: () => session?.restart(),
  }
}
