import { toolShape } from './tool-shape'
import type { ToolShape } from './tool-shape'

const TARGET_KEY: Record<string, string> = {
  Read: 'file_path',
  Write: 'file_path',
  Edit: 'file_path',
  MultiEdit: 'file_path',
  NotebookEdit: 'notebook_path',
  Bash: 'command',
  BashOutput: 'command',
  Grep: 'pattern',
  Glob: 'pattern',
  WebFetch: 'url',
  WebSearch: 'query',
}

export function shapeOfLine(line: string): ToolShape {
  const cut = line.indexOf(' ')
  const name = cut === -1 ? line : line.slice(0, cut)
  const target = cut === -1 ? '' : line.slice(cut + 1)
  const key = TARGET_KEY[name]
  if (key === undefined || target.length === 0) return toolShape(name, null)
  return toolShape(name, { [key]: target })
}

export type Tally = { read: number; wrote: number; ran: number; searched: number }

export function tally(lines: string[]): Tally {
  const counted: Tally = { read: 0, wrote: 0, ran: 0, searched: 0 }
  for (const line of lines) {
    const shape = shapeOfLine(line)
    if (shape.kind === 'file') {
      if (shape.verb === 'read') counted.read += 1
      else counted.wrote += 1
    } else if (shape.kind === 'command') counted.ran += 1
    else if (shape.kind === 'search' || shape.kind === 'web') counted.searched += 1
  }
  return counted
}
