export type McpServer = { name: string; status: string }

export type SessionIdentity = {
  id: string
  cwd: string
  model: string
  permissionMode: string
  cliVersion: string
  mcp: McpServer[]
  tools: string[]
  agents: string[]
}

export type ResultMetrics = {
  costUsd: number
  tokens: { in: number; out: number; cacheRead: number; cacheCreate: number }
  durationMs: number
  turns: number
  contextWindow: number | null
  apiErrorStatus: string | null
  stopReason: string | null
}

export type RateLimit = {
  kind: string
  utilization: number | null
  resetsAtMs: number
  resetsText?: string
  overage: boolean
  status: string
}

export type StatusEvent =
  | { type: 'session'; session: SessionIdentity }
  | { type: 'context'; used: number }
  | { type: 'metrics'; metrics: ResultMetrics }
  | { type: 'limit'; limit: RateLimit }
  | { type: 'activity'; activity: 'requesting' | 'idle' }
  | {
      type: 'compacted'
      trigger: string | null
      preTokens: number | null
      postTokens: number | null
    }
