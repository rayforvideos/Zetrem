import type { ChildTurnEvent } from '../child/child.types'

const STREAM_LINE_MAX = 120

const DEFAULT_AGENT = 'general-purpose'

type ChildOpen = Extract<ChildTurnEvent, { type: 'childOpen' }>

// A subagent is announced the same way wherever it is spawned from. The only
// thing that differs is who spawned it: the orchestrator's own turn says
// nothing, a teammate's turn names itself as the parent.
export function childOpenOf(block: Record<string, unknown>, parentId?: string): ChildOpen {
  const input = block.input as Record<string, unknown> | undefined
  return {
    type: 'childOpen',
    toolUseId: str(block.id),
    label: childLabel(block),
    // An Agent call that names no type is run by the CLI as its general-purpose
    // agent, so that is who the tile shows rather than a faceless "subagent".
    subagentType: str(input?.subagent_type) || DEFAULT_AGENT,
    prompt: str(input?.prompt),
    background: input?.run_in_background === true,
    ...(parentId === undefined ? {} : { parentId }),
  }
}

function childLabel(block: Record<string, unknown>): string {
  const input = block.input as Record<string, unknown> | undefined
  if (typeof input?.description === 'string' && input.description.length > 0)
    return input.description
  if (typeof input?.subagent_type === 'string' && input.subagent_type.length > 0)
    return input.subagent_type
  return typeof block.name === 'string' ? block.name : 'subagent'
}

export function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

const TARGET_KEYS = ['file_path', 'command', 'pattern', 'path', 'url', 'query'] as const

export function withoutCd(command: string): string {
  const cut = /^\s*cd\s+(?:'(?=[/~])[^']*'|"(?=[/~])[^"]*"|(?=[/~])[^;&|]+?)\s*(?:;|&&)\s*/
  return cut.test(command) ? command.replace(cut, '') : command
}

// ExitPlanMode carries the plan itself, written as markdown, and it belongs in
// none of the keys above: a plan is paragraphs, and the slot that names a file
// or a command would show nothing but its first words.
export function toolPlan(input: unknown): string {
  if (typeof input !== 'object' || input === null) return ''
  return str((input as Record<string, unknown>).plan)
}

export function toolTarget(input: unknown): string {
  if (typeof input !== 'object' || input === null) return ''
  for (const key of TARGET_KEYS) {
    const value = (input as Record<string, unknown>)[key]
    if (typeof value !== 'string' || value.length === 0) continue
    return key === 'command' ? withoutCd(value) : value
  }
  return ''
}

// A command can run to any length and is cut for the stream, but a path is
// kept whole: cut inside a path, the line would end on a folder, and the
// tile would show that folder's name where the file's should be. The screen
// clips what does not fit.
export function toolLine(name: string, input: unknown): string {
  const line = `${name} ${toolTarget(input)}`.trim()
  return isPath(input) ? line : line.slice(0, STREAM_LINE_MAX)
}

function isPath(input: unknown): boolean {
  if (typeof input !== 'object' || input === null) return false
  const fields = input as Record<string, unknown>
  return (
    typeof fields.command !== 'string' &&
    (typeof fields.file_path === 'string' ||
      typeof fields.path === 'string' ||
      typeof fields.notebook_path === 'string')
  )
}

// A content array off the wire can carry a null element, and reading .type off one throws.
export function blocksIn(content: unknown[]): Record<string, unknown>[] {
  return content.filter(
    (block): block is Record<string, unknown> => typeof block === 'object' && block !== null,
  )
}

export function resultText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return blocksIn(content)
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text as string)
      .join(' ')
  }
  return ''
}
