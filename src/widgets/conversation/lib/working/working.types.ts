import type { ToolShape } from '@/shared/lib/tool-shape/tool-shape.types'

export type Doing = {
  readonly verb: string
  readonly target: string
  readonly shape: ToolShape | null
}
