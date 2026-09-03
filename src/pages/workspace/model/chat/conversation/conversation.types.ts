import type { Sent } from '@/entities/attachment'
import type { PermissionAsk, SessionStatus } from '@/entities/agent-session'
import type { Chore, ToolResult, Turn } from '@/entities/conversation'

export type ConversationState = {
  turns: Turn[]
  status: SessionStatus
  permission: PermissionAsk | null
  chores: Chore[]
  trouble: boolean
}

export type Conversation = {
  get(): ConversationState
  subscribe(listener: () => void): () => void
  say(role: Turn['role'], text: string, to?: string, files?: Sent[]): void
  tool(line: string, toolUseId: string | null, input?: unknown): void
  toolResult(toolUseId: string, result: ToolResult): void
  think(text: string): void
  system(text: string): void
  delta(text: string): void
  settleDraft(): void
  setStatus(status: SessionStatus): void
  setPermission(permission: PermissionAsk | null): void
  setTrouble(trouble: boolean): void
  startChore(id: string, line: string): void
  endChore(id: string): void
  clearChores(): void
  restore(turns: Turn[]): void
  reset(): void
}
