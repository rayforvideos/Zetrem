export type McpServer = { name: string; status: string }

export type Counts = {
  tools: number
  commands: number
  agents: number
  skills: number
  plugins: number
}

export type SessionIdentity = {
  id: string
  cwd: string
  model: string
  permissionMode: string
  outputStyle: string
  cliVersion: string
  apiKeySource: string
  fastMode: { state: string; reason: string | null }
  mcp: McpServer[]
  tools: string[]
  agents: string[]
  counts: Counts
  memoryPaths: string[]
}

export type ResultMetrics = {
  costUsd: number
  tokens: { in: number; out: number; cacheRead: number; cacheCreate: number }
  durationMs: number
  ttftMs: number | null
  turns: number
  contextWindow: number | null
  apiErrorStatus: string | null
  stopReason: string | null
}

export type RateLimit = {
  kind: string
  utilization: number
  resetsAtMs: number
  overage: boolean
  status: string
}

export type StatusEvent =
  | { type: 'session'; session: SessionIdentity }
  | { type: 'context'; used: number }
  | { type: 'metrics'; metrics: ResultMetrics }
  | { type: 'limit'; limit: RateLimit }
  | { type: 'hookStarted'; hookId: string; name: string; event: string }
  | { type: 'hookDone'; hookId: string; exitCode: number; stderr: string }
  | { type: 'activity'; activity: 'requesting' | 'idle' }
  | { type: 'compacted'; trigger: string | null; preTokens: number | null; postTokens: number | null }
