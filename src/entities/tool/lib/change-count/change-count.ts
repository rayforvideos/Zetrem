import type { ToolActivity } from '@/entities/conversation/@x/tool'
import type { DiffLine } from '../diff/diff.types'
import { lineDiff, linesOf } from '../diff/diff'
import type { ChangeCount } from './change-count.types'

function inputOf(tool: ToolActivity): Record<string, unknown> {
  return (typeof tool.input === 'object' && tool.input !== null ? tool.input : {}) as Record<
    string,
    unknown
  >
}

function tally(before: string, after: string): ChangeCount | null {
  const lines = lineDiff(before, after)
  const added = lines.filter((line) => line.kind === 'add').length
  const removed = lines.filter((line) => line.kind === 'remove').length
  return added === 0 && removed === 0 ? null : { added, removed }
}

export function changeCount(tool: ToolActivity): ChangeCount | null {
  const name = tool.line.split(' ')[0] ?? ''
  const input = inputOf(tool)

  switch (name) {
    case 'Edit':
      if (typeof input.old_string !== 'string' || typeof input.new_string !== 'string') return null
      return tally(input.old_string, input.new_string)
    case 'Write': {
      if (typeof input.content !== 'string') return null
      const written = linesOf(input.content).length
      return written === 0 ? null : { added: written, removed: 0 }
    }
    case 'MultiEdit': {
      if (!Array.isArray(input.edits)) return null
      let added = 0
      let removed = 0
      for (const raw of input.edits as Record<string, unknown>[]) {
        if (typeof raw?.old_string !== 'string' || typeof raw?.new_string !== 'string') continue
        const one = tally(raw.old_string, raw.new_string)
        if (one === null) continue
        added += one.added
        removed += one.removed
      }
      return added === 0 && removed === 0 ? null : { added, removed }
    }
    default:
      return null
  }
}

function tallyGroup(lines: DiffLine[]): ChangeCount {
  let added = 0
  let removed = 0
  for (const line of lines) {
    if (line.kind === 'add') added += 1
    else if (line.kind === 'remove') removed += 1
  }
  return { added, removed }
}

// Same shape as changeCount, but reads it off diff groups already cut out
// by changeLines, rather than re-reading the tool's raw input. This is what
// lets it also count a NotebookEdit, which changeCount does not.
export function changeBadge(groups: DiffLine[][]): ChangeCount | null {
  let added = 0
  let removed = 0
  for (const group of groups) {
    const one = tallyGroup(group)
    added += one.added
    removed += one.removed
  }
  return added === 0 && removed === 0 ? null : { added, removed }
}
