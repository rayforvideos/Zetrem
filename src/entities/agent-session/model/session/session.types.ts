import type { ChangeCount, DiffLine } from '@/entities/tool/@x/agent-session'

export type SessionStatus = 'working' | 'waiting' | 'reported' | 'done'

type RunnerId = string

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
  permission?: PermissionAsk | null
  // Set for a teammate the runtime fenced into a worktree of its own: its work
  // is on branch worktree-agent-<agentId>, so the report can show and undo it.
  agentId?: string
  // Set when this session is a grandchild: a subagent a teammate itself
  // spawned, as opposed to one the orchestrator spawned directly.
  parentId?: string
}

export type Call = {
  id: string
  line: string
  startedAtMs: number
  endedAtMs: number | null
  failed: boolean
  note: string
  // The edit this call made, already cut into diff groups when the call was
  // stored. The raw arguments are not kept: a long file's contents would sit
  // in the session for as long as the run lasts, and every reader wanted the
  // same diff out of it anyway.
  change?: DiffLine[][]
  // What that change added and took away, counted alongside it.
  count?: ChangeCount
}

export type TranscriptEntry = {
  role: 'user' | 'assistant'
  text: string
  // Set when the words came from another teammate rather than the orchestrator.
  from?: string
  // When this entry was said, so it can be merged in time order with the
  // calls the teammate made around it. Absent on entries from before this
  // was tracked; those sort ahead of anything timestamped.
  atMs?: number
}
