import type { ToolShape } from '@/entities/tool'

export type Doing = {
  readonly verb: string
  readonly target: string
  readonly shape: ToolShape | null
}
