import { personaOf } from '@/entities/agent-session'
import type { ToolActivity, Turn } from '@/entities/conversation'
import { toolShape } from '@/shared/lib/tool-shape/tool-shape'
import type { ToolShape } from '@/shared/lib/tool-shape/tool-shape.types'
import { targetOf, verbOf } from '@/shared/lib/tool-verb/tool-verb'
import { toolNameOf } from '@/shared/lib/tool-line/tool-line'
import type { Doing } from './working.types'
import { t } from '@lingui/core/macro'

const HANDOFF_MS = 2500

function starting(): Doing {
  return { verb: t`Starting`, target: '', shape: null }
}

function shapeOf(tool: ToolActivity): ToolShape {
  return toolShape(toolNameOf(tool.line), tool.input)
}

function whoOf(shape: ToolShape): string {
  if (shape.kind !== 'agent') return ''
  return personaOf(shape.subagentType).name
}

function crewLine(shape: ToolShape): string {
  const name = whoOf(shape)
  const said = shape.kind === 'agent' ? shape.description.trim() : ''
  if (name.length === 0) return said
  if (said.length === 0) return name
  return said.toLowerCase().startsWith(name.toLowerCase()) ? said : `${name} · ${said}`
}

function reportsBack(tools: ToolActivity[]): number {
  let count = 0
  for (let at = tools.length - 1; at >= 0; at -= 1) {
    if (shapeOf(tools[at]!).kind !== 'agent') break
    count += 1
  }
  return count
}

function exchangeOf(turns: Turn[]): Turn[] {
  const asked = turns.findLastIndex((turn) => turn.role === 'user')
  return turns.slice(asked + 1).filter((turn) => turn.role === 'assistant')
}

export function doingOf(turns: Turn[], nowMs = 0): Doing {
  const talk = exchangeOf(turns)
  const last = talk.at(-1)
  if (last === undefined) return starting()
  const tools = talk.flatMap((turn) => turn.tools)

  const away = tools.filter((one) => one.result === null && shapeOf(one).kind === 'agent')
  if (away.length > 1) {
    const shape: ToolShape = { kind: 'agent', subagentType: '', description: '' }
    return { verb: t`Waiting on`, target: t`${away.length} teammates`, shape }
  }
  if (away.length === 1) {
    const held = away[0]!
    const shape = shapeOf(held)
    const settled = nowMs - held.startedAtMs >= HANDOFF_MS
    return { verb: settled ? t`Waiting on` : t`Handing off`, target: crewLine(shape), shape }
  }

  const busy = tools.findLast((one) => one.result === null)
  if (busy !== undefined) {
    const shape = shapeOf(busy)
    return { verb: verbOf(shape), target: targetOf(shape), shape }
  }

  if (last.draft.length > 0) return { verb: t`Writing`, target: '', shape: null }
  if (last.thinking.length > 0 && last.text.length === 0) {
    return { verb: t`Thinking`, target: '', shape: null }
  }

  if (last.text.length === 0) {
    const back = reportsBack(tools)
    if (back > 0) {
      const shape = shapeOf(tools.at(-1)!)
      const name = whoOf(shape)
      const target = back > 1 ? t`${back} teammates` : name.length > 0 ? name : t`a teammate`
      return { verb: t`Waiting on`, target, shape }
    }
  }

  if (tools.length === 0 && last.text.length === 0) return starting()
  return { verb: t`Working`, target: '', shape: null }
}

export function askedAtMs(turns: Turn[], fallbackMs: number): number {
  const asked = turns.findLast((turn) => turn.role === 'user')
  return asked?.startedAtMs ?? turns.at(-1)?.startedAtMs ?? fallbackMs
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
