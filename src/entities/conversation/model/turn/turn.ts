import type { Sent } from '@/entities/attachment/lib/attachment/attachment.types'

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
  /** View identity only: keys the list so trims can't shift state between
   * turns. Assigned fresh on creation and on every transcript read; the value
   * that lands in a saved file carries no meaning. */
  id: string
  role: 'user' | 'assistant' | 'system'
  text: string
  files?: Sent[]
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
