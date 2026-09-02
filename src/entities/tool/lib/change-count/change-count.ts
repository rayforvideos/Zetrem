import type { ToolActivity } from '@/entities/conversation/@x/tool'
import type { DiffLine } from '../diff/diff.types'
import { changeLines } from '../change-lines/change-lines'
import { toolNameOf } from '../tool-line/tool-line'
import type { ChangeCount } from './change-count.types'

// What a tool call added and took away, read off the very diff the app draws
// for it. Counting the rows rather than the raw input is what keeps the badge
// and the lines under it from ever disagreeing.
export function changeCount(tool: ToolActivity): ChangeCount | null {
  return changeBadge(changeLines(toolNameOf(tool.line), tool.input))
}

// The same count, for a caller that already holds the diff groups.
export function changeBadge(groups: DiffLine[][]): ChangeCount | null {
  let added = 0
  let removed = 0
  for (const group of groups) {
    for (const line of group) {
      if (line.kind === 'add') added += 1
      else if (line.kind === 'remove') removed += 1
    }
  }
  return added === 0 && removed === 0 ? null : { added, removed }
}
