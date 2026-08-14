import type { AgentSession, SessionStatus } from '@/entities/agent-session'

export type Branch = {
  id: string
  label: string
  subagentType: string
  status: SessionStatus
  startX: number
  endX: number
  lane: number
  live: boolean
}

export type WorkMap = {
  branches: Branch[]
  lanes: number
  spanMs: number
}
