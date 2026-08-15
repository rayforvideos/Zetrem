import type { Turn } from '@/entities/conversation'
import { toolShape } from '@/shared/lib/tool-shape/tool-shape'
import { targetOf, verbOf } from '@/shared/lib/tool-verb/tool-verb'
import type { Doing } from './working.types'

export function doingOf(turn: Turn | null): Doing {
  if (turn === null) return { verb: 'Starting', target: '', shape: null }
  const last = turn.tools.at(-1)
  if (last !== undefined && last.result === null) {
    const shape = toolShape(last.line.split(' ')[0] ?? '', last.input)
    return { verb: verbOf(shape), target: targetOf(shape), shape }
  }
  if (turn.draft.length > 0 || turn.text.length > 0) {
    return { verb: 'Writing', target: '', shape: null }
  }
  if (turn.thinking.length > 0) return { verb: 'Thinking', target: '', shape: null }
  return { verb: 'Working', target: '', shape: null }
}

export function askedAtMs(turns: Turn[], fallbackMs: number): number {
  for (let at = turns.length - 1; at >= 0; at -= 1) {
    const turn = turns[at]
    if (turn !== undefined && turn.role === 'user') return turn.startedAtMs
  }
  return turns.at(-1)?.startedAtMs ?? fallbackMs
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
