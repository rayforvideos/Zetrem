import type { ChatSession, LiveState } from './chat-session/chat-session.types'

// Chat id → what that chat is doing, for every chat doing anything. A chat
// that is idle is simply absent, so the sidebar reads one small object.
export type Working = Record<string, Exclude<LiveState, 'idle'>>

export type Held = { session: ChatSession; unsubscribe: () => void }
