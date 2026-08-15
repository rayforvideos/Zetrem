export type ToolResult = {
  stdout: string
  stderr: string
  isError: boolean
  interrupted: boolean
}

export type ToolActivity = {
  line: string
  toolUseId: string | null
  input: unknown
  result: ToolResult | null
  startedAtMs: number
  endedAtMs: number | null
}

export type Turn = {
  role: 'user' | 'assistant' | 'system'
  text: string
  tools: ToolActivity[]
  draft: string
  thinking: string
  startedAtMs: number
  to?: string
}

export type Chore = {
  readonly id: string
  readonly line: string
  readonly startedAtMs: number
}
