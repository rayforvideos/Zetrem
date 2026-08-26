import type { ToolShape } from '@/entities/tool'

export type Lane = {
  id: string
  name: string
  subagentType: string
  verb: string
  target: string
  shape: ToolShape | null
  outMs: number
  live: boolean
  needsYou: boolean
}
