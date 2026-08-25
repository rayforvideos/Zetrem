import type { Call } from '@/entities/agent-session'
import type { ToolShape } from '@/shared/lib/tool-shape/tool-shape.types'
import { shapeOfLine } from '@/shared/lib/tool-line/tool-line'
import type { Scene } from './now.types'

export function currentCall(calls: Call[]): Call | null {
  return calls.findLast((call) => call.endedAtMs === null) ?? calls.at(-1) ?? null
}

const BY_NAME: Record<string, ToolShape> = {
  Read: { kind: 'file', verb: 'read', dir: '', name: '' },
  Write: { kind: 'file', verb: 'write', dir: '', name: '' },
  Edit: { kind: 'file', verb: 'edit', dir: '', name: '' },
  MultiEdit: { kind: 'file', verb: 'edit', dir: '', name: '' },
  NotebookEdit: { kind: 'file', verb: 'edit', dir: '', name: '' },
  Bash: { kind: 'command', command: '' },
  BashOutput: { kind: 'command', command: '' },
  Grep: { kind: 'search', pattern: '', scope: '' },
  Glob: { kind: 'search', pattern: '', scope: '' },
  WebFetch: { kind: 'web', label: '' },
  WebSearch: { kind: 'web', label: '' },
  Agent: { kind: 'agent', subagentType: '', description: '' },
  Task: { kind: 'agent', subagentType: '', description: '' },
}

export function shapeOfCall(line: string): ToolShape {
  const shape = shapeOfLine(line)
  if (shape.kind !== 'plain') return shape
  return BY_NAME[shape.name] ?? shape
}

export function sceneOf(shape: ToolShape): Scene {
  switch (shape.kind) {
    case 'file':
      return shape.verb === 'read' ? 'read' : 'write'
    case 'command':
      return 'run'
    case 'search':
      return 'search'
    case 'web':
      return 'web'
    case 'agent':
      return 'summon'
    default:
      return 'think'
  }
}
