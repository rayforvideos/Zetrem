import type { Sent } from '@/entities/attachment/@x/conversation'

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
  /**
   * How much of the turn's text had been said when this tool ran, so the
   * screen can put the run back where it happened. Missing on turns saved
   * before a tool could sit mid-text: those all ran after the text.
   */
  at?: number
}

export type Turn = {
  /** View identity only: reassigned on every transcript read, so a saved value means nothing. */
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
