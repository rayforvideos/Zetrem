import type { ToolShape } from '@/shared/lib/tool-shape/tool-shape.types'

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
