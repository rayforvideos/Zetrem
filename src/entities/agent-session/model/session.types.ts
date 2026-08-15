export type SessionStatus = 'working' | 'waiting' | 'reported' | 'done'

export type RunnerId = string

export type PermissionAsk = {
  requestId: string
  toolName: string
  line: string
  detail: string
}

export type AgentSession = {
  id: string
  runnerId: RunnerId
  label: string
  subagentType: string
  model: string
  status: SessionStatus
  headline: string
  doing?: string
  stream: Call[]
  transcript: TranscriptEntry[]
  tokens: number
  contextUsed: number
  startedAtMs: number
  detached?: boolean
  taskId?: string
  lastSeenAtMs?: number
  endedAtMs?: number
  waitingSinceMs?: number
  outcome?: WorkOutcome | null
  permission?: PermissionAsk | null
}

export type Call = {
  id: string
  line: string
  startedAtMs: number
  endedAtMs: number | null
  failed: boolean
  note: string
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
