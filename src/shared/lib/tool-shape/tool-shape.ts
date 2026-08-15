import type { ToolShape } from './tool-shape.types'

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function splitPath(path: string): { dir: string; name: string } {
  const cut = path.lastIndexOf('/')
  return cut === -1 ? { dir: '', name: path } : { dir: path.slice(0, cut + 1), name: path.slice(cut + 1) }
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

const FILE_VERB: Record<string, 'read' | 'write' | 'edit'> = {
  Read: 'read',
  NotebookEdit: 'edit',
  Write: 'write',
  Edit: 'edit',
  MultiEdit: 'edit',
}

export function toolShape(name: string, input: unknown): ToolShape {
  const plain: ToolShape = { kind: 'plain', name }
  const fields = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>

  const verb = FILE_VERB[name]
  if (verb) {
    const path = str(fields.file_path) ?? str(fields.notebook_path)
    return path ? { kind: 'file', verb, ...splitPath(path) } : plain
  }

  if (name === 'Bash' || name === 'BashOutput') {
    const command = str(fields.command)
    return command ? { kind: 'command', command } : plain
  }

  if (name === 'Grep' || name === 'Glob') {
    const pattern = str(fields.pattern)
    return pattern ? { kind: 'search', pattern, scope: str(fields.path) ?? '' } : plain
  }

  if (name === 'WebFetch' || name === 'WebSearch') {
    const url = str(fields.url)
    if (url) return { kind: 'web', label: domainOf(url) }
    const query = str(fields.query)
    return query ? { kind: 'web', label: query } : plain
  }

  if (name === 'Agent' || name === 'Task') {
    return {
      kind: 'agent',
      subagentType: str(fields.subagent_type) ?? '',
      description: str(fields.description) ?? '',
    }
  }

  if (name === 'TodoWrite') return { kind: 'todo' }

  return plain
}

export function resultNote(shape: ToolShape, stdout: string | null): string | null {
  if (stdout === null) return null
  if (shape.kind === 'file' && shape.verb === 'read') {
    const lines = stdout.length === 0 ? 0 : stdout.split('\n').length
    return lines > 0 ? `${lines} lines` : null
  }
  if (shape.kind === 'search') {
    const hits = stdout.trim().length === 0 ? 0 : stdout.trim().split('\n').length
    return hits === 0 ? 'none' : `${hits} hits`
  }
  if (shape.kind === 'command') {
    const body = stdout.trim()
    if (body.length === 0) return 'no output'
    const lines = body.split('\n')
    return lines.length === 1 ? clipNote(lines[0]!) : `${lines.length} lines`
  }
  return null
}

const NOTE_MAX = 48

function clipNote(text: string): string {
  return text.length <= NOTE_MAX ? text : `${text.slice(0, NOTE_MAX - 1)}…`
}
