import type { ChatStatus, SessionStore } from '@/entities/agent-session'
import type { ModelChoice, RateLimit } from '@/entities/claude-cli'
import type { Conversation } from '../../chat/conversation/conversation.types'

type Sent = { to: string; message: string }

export type AgentStores = {
  conversation: Conversation
  status: ChatStatus
  children: SessionStore
}

export type AgentEventRefs = {
  stores: AgentStores
  asks: {
    requestId: string
    toolName: string
    line: string
    detail: string
    plan?: string
    input: unknown
  }[]
  childIds: Set<string>
  sends: Map<string, Sent>
  // Per limit kind, the state of it the chat was last told about.
  limits: Map<string, string>
  // Task id → the child session that backgrounded the shell (was module state in crew-bash).
  ownedBash: Map<string, string>
  // toolUseId → taskId announced before the child opened (was module state in crew).
  pendingTasks: Map<string, string>
  onModelRefused(model: ModelChoice): void
  onLimit(limit: RateLimit): void
}
