export type SessionStatus = 'working' | 'waiting' | 'done'

export type RunnerId = string

export type PermissionAsk = {
  requestId: string
  toolName: string
  line: string
}

export type AgentSession = {
  id: string
  runnerId: RunnerId
  label: string
  subagentType: string
  model: string
  status: SessionStatus
  headline: string
  stream: string[]
  transcript: TranscriptEntry[]
  tokens: number
  contextUsed: number
  startedAtMs: number
  endedAtMs?: number
  waitingSinceMs?: number
  outcome?: WorkOutcome | null
  permission?: PermissionAsk | null
}

export type TranscriptEntry = {
  role: 'user' | 'assistant'
  text: string
}

export type WorkOutcome = {
  branch: string
  commits: number
  dirtyFiles: number
}
