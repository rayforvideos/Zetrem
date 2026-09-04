import type { PermissionAsk, SessionStatus } from '@/entities/agent-session'
import type { Turn } from '@/entities/conversation'

type WaitKind = 'permission' | 'question'

// What the run stopped for, and the one line worth repeating back: the tool a
// permission ask names, or the question that was put to the person.
export type WaitingOn = { kind: WaitKind; said: string }

// A wait as the chat itself knows it. The mark is what this particular wait
// is, so it stays the same however the screen happens to be looking at the
// chat, and changes only when the wait itself does.
export type Held = WaitingOn & { mark: string }

// One chat that has stopped for the person, as the workspace sees it.
export type Wait = Held & {
  chatId: string
  title: string
  // The chat is the one the screen is showing, so the ask is already in view.
  onScreen: boolean
}

// Where a wait is worth raising, given where the person is.
export type Where = 'system' | 'toast' | 'nothing'

// One wait as the ledger remembers it: when it first stood, when it was last
// raised, and how often.
type Told = { mark: string; seenAtMs: number; toldAtMs: number; times: number }

// Chat id to what has been said about that chat's wait.
export type Ledger = Record<string, Told>

export type Telling = { wait: Wait; where: Exclude<Where, 'nothing'>; again: boolean }

// The slice of a conversation a wait is read out of.
export type Settled = {
  turns: readonly Turn[]
  status: SessionStatus
  permission: PermissionAsk | null
}
