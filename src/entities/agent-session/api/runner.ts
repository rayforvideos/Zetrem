import type { PermissionAsk, RunnerId, SessionStatus, WorkOutcome } from '../model/session.types'

export type RunSink = {
  headline(text: string): void
  stream(line: string): void
  meter(patch: { tokens?: number; contextUsed?: number }): void
  status(next: SessionStatus): void
  permission(ask: PermissionAsk | null): void
  message(role: 'user' | 'assistant', text: string): void
  outcome(outcome: WorkOutcome): void
  child(event: ChildEvent): void
}

export type ChildEvent =
  | { kind: 'open'; childId: string; label: string; prompt: string }
  | { kind: 'say'; childId: string; role: 'user' | 'assistant'; text: string }
  | { kind: 'stream'; childId: string; line: string }
  | { kind: 'close'; childId: string }

export type RunHandle = {
  stop(): void
  send?(text: string): void
  decide?(allow: boolean, always?: boolean): void
}

export type AgentRunner = {
  id: RunnerId
  label: string
  model: string
  start(prompt: string, sink: RunSink): RunHandle
}
