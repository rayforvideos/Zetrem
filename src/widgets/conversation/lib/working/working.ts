import type { Turn } from '@/entities/conversation'
import { toolShape } from '@/shared/lib/tool-shape/tool-shape'
import { verbOf } from '@/shared/lib/tool-verb/tool-verb'

export function doingOf(turn: Turn | null): string {
  if (turn === null) return 'Starting'
  const last = turn.tools.at(-1)
  if (last !== undefined && last.result === null) {
    return verbOf(toolShape(last.line.split(' ')[0] ?? '', last.input))
  }
  if (turn.draft.length > 0 || turn.text.length > 0) return 'Writing'
  if (turn.thinking.length > 0) return 'Thinking'
  return 'Working'
}

export function elapsedLabel(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

export function tokenLabel(tokens: number): string {
  if (tokens <= 0) return ''
  if (tokens < 1000) return `${tokens} out`
  return `${(tokens / 1000).toFixed(1)}k out`
}
