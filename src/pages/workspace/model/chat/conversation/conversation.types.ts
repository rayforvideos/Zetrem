import type { PermissionAsk, SessionStatus } from '@/entities/agent-session'
import type { Chore, Turn } from '@/entities/conversation'

export type { Chore, ToolActivity, ToolResult, Turn } from '@/entities/conversation'

export type ConversationState = {
  turns: Turn[]
  status: SessionStatus
  permission: PermissionAsk | null
  chores: Chore[]
  trouble: boolean
}
