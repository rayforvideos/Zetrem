import type { PermissionAsk, SessionStatus } from '@/entities/agent-session'
import type { Turn } from '@/entities/conversation'

export type WaitKind = 'permission' | 'question'

// What the run stopped for, and the one line worth repeating back: the tool a
// permission ask names, or the question that was put to the person.
export type WaitingOn = { kind: WaitKind; said: string }

// One chat that has stopped for the person, as the workspace sees it.
export type Wait = WaitingOn & {
  chatId: string
  title: string
  // What this wait is, so a second ask in the same chat is a second wait and
  // gets its own word rather than inheriting the first one's silence.
  mark: string
  // The chat is the one the screen is showing, so the ask is already in view.
  onScreen: boolean
  // The settle grace (#50) has passed, so this is not a teammate's hand-back
  // caught mid-flight. A permission ask is explicit and never waits on it.
  steady: boolean
}

// Where a wait is worth raising, given where the person is.
export type Where = 'system' | 'toast' | 'nothing'

// One wait as the ledger remembers it: when it was last raised, and how often.
type Told = { mark: string; toldAtMs: number; times: number }

// Chat id to what has been said about that chat's wait.
export type Ledger = Record<string, Told>

export type Telling = { wait: Wait; where: Exclude<Where, 'nothing'>; again: boolean }

// The slice of a conversation a wait is read out of.
export type Settled = {
  turns: readonly Turn[]
  status: SessionStatus
  permission: PermissionAsk | null
}

// A chat that is doing something, as the registry reports it.
export type LiveWait = 'asking' | 'question'
