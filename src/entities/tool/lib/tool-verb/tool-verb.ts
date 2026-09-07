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

// What a tool is, named rather than identified. verbOf reads what is happening
// now off the shape of a call; a card asking permission has only the tool's
// name to go on, and that name used to be set down raw in the middle of a
// Korean sentence. A tool nobody has a word for keeps its name, because for a
// connector's tool the name is all there is.
export function toolWord(name: string): string {
  switch (name) {
    case 'Read':
      return t`Read a file`
    case 'Write':
      return t`Write a file`
    case 'Edit':
    case 'MultiEdit':
    case 'NotebookEdit':
      return t`Edit a file`
    case 'Bash':
    case 'BashOutput':
      return t`Run a command`
    case 'Grep':
    case 'Glob':
      return t`Search`
    case 'WebFetch':
    case 'WebSearch':
      return t`Reach the web`
    case 'Agent':
    case 'Task':
      return t`Hand off to a teammate`
    case 'TodoWrite':
      return t`Sort out the next steps`
    case 'AskUserQuestion':
      return t`Answer a question`
    case 'ExitPlanMode':
      return t`Approve a plan`
    default:
      return name
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
      return t`the next steps`
    default:
      return shape.name
  }
}
