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
}

export type Turn = {
  role: 'user' | 'assistant' | 'system'
  text: string
  tools: ToolActivity[]
  draft: string
  thinking: string
  startedAtMs: number
}
