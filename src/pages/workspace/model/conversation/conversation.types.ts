import type { PermissionAsk, SessionStatus } from '@/entities/agent-session'
import type { Chore, Turn } from '@/entities/conversation'

export type { Chore, ToolActivity, ToolResult, Turn } from '@/entities/conversation'

export type ConversationState = {
  turns: Turn[]
  status: SessionStatus
  permission: PermissionAsk | null
  chores: Chore[]
  // Set when the turn that just settled ended in an error rather than a clean finish,
  // so the "done" nudge can say so instead of lying.
  trouble: boolean
}
