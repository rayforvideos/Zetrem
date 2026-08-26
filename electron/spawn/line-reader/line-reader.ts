import type { LineReader } from './line-reader.types'

const LINE_MAX = 1_000_000

export function lineReader(max: number = LINE_MAX): LineReader {
  let held = ''
  let dropping = false

  return {
    take(chunk: string): string[] {
      const parts = (held + chunk).split('\n')
      held = parts.pop() ?? ''
      const found: string[] = []
      for (const part of parts) {
        if (dropping) {
          dropping = false
          continue
        }
        if (part.trim().length > 0) found.push(part)
      }
      if (held.length > max) {
        held = ''
        dropping = true
      }
      return found
    },
  }
}
