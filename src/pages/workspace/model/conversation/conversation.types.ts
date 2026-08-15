import type { PermissionAsk, SessionStatus } from '@/entities/agent-session'
import type { Turn } from '@/entities/conversation'

export type { ToolActivity, ToolResult, Turn } from '@/entities/conversation'

export type ConversationState = {
  turns: Turn[]
  status: SessionStatus
  permission: PermissionAsk | null
}
