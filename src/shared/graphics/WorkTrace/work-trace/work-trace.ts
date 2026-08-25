import type { Bar, Mark } from './work-trace.types'

import { shapeOfLine } from '../../../lib/tool-line/tool-line'

const MIN_WIDTH = 2
const MAX_WIDTH = 16
const QUICK_MS = 100
const SLOW_MS = 60_000

export function widthOf(ms: number): number {
  if (!Number.isFinite(ms) || ms <= 0) return MIN_WIDTH
  const reach = Math.log1p(ms / QUICK_MS) / Math.log1p(SLOW_MS / QUICK_MS)
  const span = MIN_WIDTH + (MAX_WIDTH - MIN_WIDTH) * reach
  return Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, span)))
}

export function heightOf(line: string): number {
  const shape = shapeOfLine(line)
  switch (shape.kind) {
    case 'agent':
      return 12
    case 'command':
      return 9
    case 'file':
      return shape.verb === 'read' ? 4 : 9
    case 'search':
    case 'web':
      return 4
    default:
      return 3
  }
}

export function barsOf(marks: Mark[]): Bar[] {
  return marks.map((mark) => ({
    width: widthOf(mark.ms),
    height: heightOf(mark.line),
    failed: mark.failed,
    running: mark.running,
  }))
}
