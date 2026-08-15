import type { RosterState } from '@/entities/agent-session'

export type Origin = 'project' | 'user' | 'session'

export type TeamMember = {
  type: string
  name: string
  description: string
  model: string | null
  character: string | null
  origin: Origin
  loaded: boolean
  callable: boolean
  state: RosterState
  note: string | null
  sessionId: string | null
}
