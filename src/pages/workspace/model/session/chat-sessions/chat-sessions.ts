import { createChatSession } from './chat-session/chat-session'
import type { AgentEvent, ChatSession, ChatSessionDeps } from './chat-session/chat-session.types'
import type { Held, SaveListener, Working } from './chat-sessions.types'

const held = new Map<string, Held>()
const listeners = new Set<() => void>()
const saveListeners = new Set<SaveListener>()
// Which chat each project was last showing. It outlives a screen rebuild (a
// language change), which is the whole reason it lives out here.
const lastOpen = new Map<string, string>()

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
  // Before anything else can make the stores emit: a subscription left alive
  // would queue one more write for a chat that is on its way out.
  one.session.dispose()
  held.delete(chatId)
}

// Told after every write that lands. Two things wait on it: the chat list,
// which cannot show a chat it has never been told about, and the release of a
// session whose process is gone and whose last save is now on disk.
function saved(chatId: string, project: string): void {
  for (const listener of saveListeners) listener(chatId, project)
  const one = held.get(chatId)
  if (one === undefined || !one.exited) return
  if (one.session.running() || one.session.live() !== 'idle') return
  // The chat on screen keeps its turns in memory: reopening it must not go
  // back to disk for what the person is already looking at.
  if (lastOpen.get(one.session.project) === chatId) return
  drop(chatId)
  changed()
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
    const session = createChatSession(chatId, project, deps, () => saved(chatId, project))
    held.set(chatId, { session, unsubscribe: session.subscribe(changed), exited: false })
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
    for (const [project, open] of lastOpen) {
      if (open === chatId) lastOpen.delete(project)
    }
    if (one === undefined) return
    // Written, then let go, then stopped: a reset makes the stores emit, and
    // an autosave still listening would write the chat back after the person
    // asked for it to go.
    one.session.keep()
    drop(chatId)
    one.session.reset()
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
  // The chat this project is showing. Remembered out here so a screen rebuild
  // comes back to the chat the person was reading, not to whichever chat saved
  // last.
  opened(chatId: string, project: string): void {
    lastOpen.set(project, chatId)
  },
  lastOpened(project: string): string | null {
    return lastOpen.get(project) ?? null
  },
  onSaved(listener: SaveListener): () => void {
    saveListeners.add(listener)
    return () => {
      saveListeners.delete(listener)
    }
  },
  handle(event: AgentEvent): void {
    for (const one of held.values()) {
      if (!one.session.owns(event.id)) continue
      one.session.handle(event)
      // An exit the relaunch picked back up is not an exit: the session has a
      // process again, and only a session with none is ever let go.
      if (event.kind === 'exit') one.exited = !one.session.running()
      return
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
      const one = held.get(chatId)
      drop(chatId)
      one?.session.reset()
    }
    lastOpen.clear()
    saveListeners.clear()
    working = {}
  },
}
