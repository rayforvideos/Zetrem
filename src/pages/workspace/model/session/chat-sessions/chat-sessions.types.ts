import type { ChatSession, LiveState } from './chat-session/chat-session.types'

// Chat id → what that chat is doing, for every chat doing anything. A chat
// that is idle is simply absent, so the sidebar reads one small object.
export type Working = Record<string, Exclude<LiveState, 'idle'>>

// `exited` is true once the chat's process has gone and nothing relaunched in
// its place: the session is then only waiting for its last save to land.
export type Held = { session: ChatSession; unsubscribe: () => void; exited: boolean }

export type SaveListener = (chatId: string, project: string) => void
