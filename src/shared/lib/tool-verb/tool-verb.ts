import type { ToolShape } from '../tool-shape/tool-shape.types'

const FILE_VERBS = { read: 'Reading', write: 'Writing', edit: 'Editing' } as const

export function verbOf(shape: ToolShape): string {
  switch (shape.kind) {
    case 'file':
      return FILE_VERBS[shape.verb]
    case 'command':
      return 'Running'
    case 'search':
      return 'Searching'
    case 'web':
      return 'Fetching'
    case 'agent':
      return 'Handing off'
    case 'todo':
      return 'Planning'
    default:
      return 'Working'
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
