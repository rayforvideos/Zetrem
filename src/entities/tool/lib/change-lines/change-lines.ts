import type { DiffLine } from '../diff/diff.types'
import { lineDiff } from '../diff/diff'

function recordOf(input: unknown): Record<string, unknown> {
  return typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}
}

// The same shapes ToolDetail used to read inline, cut out as groups a diff
// view can draw without knowing what tool call they came from.
export function changeLines(name: string, input: unknown): DiffLine[][] {
  const record = recordOf(input)

  switch (name) {
    case 'Edit': {
      if (typeof record.old_string !== 'string' || typeof record.new_string !== 'string') {
        return []
      }
      const lines = lineDiff(record.old_string, record.new_string)
      return lines.length === 0 ? [] : [lines]
    }
    case 'MultiEdit': {
      if (!Array.isArray(record.edits)) return []
      return (record.edits as Record<string, unknown>[])
        .filter(
          (edit) => typeof edit?.old_string === 'string' && typeof edit?.new_string === 'string',
        )
        .map((edit) => lineDiff(edit.old_string as string, edit.new_string as string))
        .filter((lines) => lines.length > 0)
    }
    case 'Write': {
      if (typeof record.content !== 'string') return []
      const lines = lineDiff('', record.content)
      return lines.length === 0 ? [] : [lines]
    }
    case 'NotebookEdit': {
      if (typeof record.new_source !== 'string') return []
      const lines = lineDiff('', record.new_source)
      return lines.length === 0 ? [] : [lines]
    }
    default:
      return []
  }
}
