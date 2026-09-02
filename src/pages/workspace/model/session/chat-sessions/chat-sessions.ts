import { createChatSession } from './chat-session/chat-session'
import type { AgentEvent, ChatSession, ChatSessionDeps } from './chat-session/chat-session.types'
import type { Held, Working } from './chat-sessions.types'

const held = new Map<string, Held>()
const listeners = new Set<() => void>()

let deps: ChatSessionDeps | null = null
let working: Working = {}

function sameWorking(before: Working, after: Working): boolean {
  const names = Object.keys(after)
  if (names.length !== Object.keys(before).length) return false
  return names.every((name) => before[name] === after[name])
}

function readWorking(): Working {
  const next: Working = {}
  for (const [chatId, one] of held) {
    const state = one.session.live()
    if (state !== 'idle') next[chatId] = state
  }
  return next
}

// The snapshot is read through useSyncExternalStore, which compares by
// identity: a fresh object every time would rebuild the sidebar on every line
// of every stream.
function changed(): void {
  const next = readWorking()
  if (!sameWorking(working, next)) working = next
  for (const listener of listeners) listener()
}

function drop(chatId: string): void {
  const one = held.get(chatId)
  if (one === undefined) return
  one.unsubscribe()
  held.delete(chatId)
}

export const chatSessions = {
  attach(bridge: ChatSessionDeps): void {
    deps = bridge
  },
  open(chatId: string, project: string): ChatSession {
    const already = held.get(chatId)
    if (already !== undefined) return already.session
    if (deps === null) {
      throw new Error('chatSessions.open before attach: a session has nothing to run on')
    }
    const session = createChatSession(chatId, project, deps)
    held.set(chatId, { session, unsubscribe: session.subscribe(changed) })
    changed()
    return session
  },
  find(chatId: string): ChatSession | null {
    return held.get(chatId)?.session ?? null
  },
  // Leaving a chat drops nothing that is still going: that is the whole point.
  // A chat with no process and nothing pending is only memory once it is off
  // screen, and its transcript is already on disk.
  release(chatId: string): void {
    const one = held.get(chatId)
    if (one === undefined) return
    if (one.session.running() || one.session.live() !== 'idle') return
    one.session.keep()
    drop(chatId)
    changed()
  },
  // The person asked for this chat to go.
  forget(chatId: string): void {
    const one = held.get(chatId)
    if (one === undefined) return
    one.session.keep()
    one.session.reset()
    drop(chatId)
    changed()
  },
  // An account change is the one thing that stops every chat: a live CLI
  // writes into the credentials file all accounts share.
  stopAll(note: string): void {
    for (const { session } of held.values()) {
      if (session.running()) {
        session.reset()
        session.stores.conversation.system(note)
      }
      // Said to every chat, running or not: the session on hand is the CLI's,
      // and the CLI's session belongs to the account that started it.
      session.stores.status.forgetSession()
    }
    changed()
  },
  live(): Working {
    return working
  },
  handle(event: AgentEvent): void {
    for (const { session } of held.values()) {
      if (session.owns(event.id)) {
        session.handle(event)
        return
      }
    }
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  // Tests only: every session gone, with nothing left running behind them.
  clear(): void {
    for (const chatId of [...held.keys()]) {
      held.get(chatId)?.session.reset()
      drop(chatId)
    }
    working = {}
  },
}
