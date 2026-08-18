import { t } from '@lingui/core/macro'
import type { ToolShape } from '../tool-shape/tool-shape.types'

function fileVerb(verb: 'read' | 'write' | 'edit'): string {
  switch (verb) {
    case 'read':
      return t`Reading`
    case 'write':
      return t`Writing`
    default:
      return t`Editing`
  }
}

export function verbOf(shape: ToolShape): string {
  switch (shape.kind) {
    case 'file':
      return fileVerb(shape.verb)
    case 'command':
      return t`Running`
    case 'search':
      return t`Searching`
    case 'web':
      return t`Fetching`
    case 'agent':
      return t`Handing off`
    case 'todo':
      return t`Planning`
    default:
      return t`Working`
  }
}

export function targetOf(shape: ToolShape): string {
  switch (shape.kind) {
    case 'file':
      return shape.name
    case 'command':
      return shape.command
    case 'search':
      return shape.pattern
    case 'web':
      return shape.label
    case 'agent':
      return shape.description
    case 'todo':
      return 'the next steps'
    default:
      return shape.name
  }
}
