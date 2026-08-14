import type { ToolActivity } from '@/entities/conversation'
import { cn } from '@/shared/lib/cn'
import type { DiffLine } from '../../lib/diff/diff.types'
import { lineDiff } from '../../lib/diff/diff'
import { TOOL_OUTPUT_LINES, moreLine } from '../../lib/limits'

export function ToolDetail({ tool }: { tool: ToolActivity }) {
  const name = toolName(tool)
  const input = toolInput(tool)

  if (name === 'Edit') {
    if (typeof input.old_string !== 'string' || typeof input.new_string !== 'string') return null
    const lines = lineDiff(input.old_string, input.new_string)
    if (lines.length === 0) return null
    return <Diff lines={lines} />
  }

  if (name === 'MultiEdit') {
    if (!Array.isArray(input.edits)) return null
    const groups = (input.edits as Record<string, unknown>[])
      .filter((edit) => typeof edit?.old_string === 'string' && typeof edit?.new_string === 'string')
      .map((edit) => lineDiff(edit.old_string as string, edit.new_string as string))
      .filter((lines) => lines.length > 0)
    if (groups.length === 0) return null
    return (
      <div className="flex flex-col gap-1">
        {groups.map((lines, index) => (
          <Diff key={index} lines={lines} />
        ))}
      </div>
    )
  }

  if (name === 'Write') {
    if (typeof input.content !== 'string') return null
    const lines = lineDiff('', input.content)
    if (lines.length === 0) return null
    return <Diff lines={lines} />
  }

  if (name === 'TodoWrite') {
    if (!Array.isArray(input.todos)) return null
    const todos = (input.todos as Record<string, unknown>[]).filter(
      (todo) => typeof todo?.content === 'string',
    )
    if (todos.length === 0) return null
    return (
      <ul className="flex flex-col gap-0.5">
        {todos.map((todo, index) => {
          const status = typeof todo.status === 'string' ? todo.status : 'pending'
          return (
            <li
              key={`${index}-${String(todo.content)}`}
              className={cn(
                'flex items-baseline gap-1.5 font-mono text-xs leading-normal',
                status === 'completed' && 'line-through text-muted-foreground',
                status === 'in_progress' && 'text-foreground',
                status !== 'completed' && status !== 'in_progress' && 'text-muted-foreground',
              )}
            >
              <span className="flex-none">
                {status === 'completed' ? '✓' : status === 'in_progress' ? '▸' : '·'}
              </span>
              <span className="[overflow-wrap:anywhere]">{String(todo.content)}</span>
            </li>
          )
        })}
      </ul>
    )
  }

  return null
}

function toolName(tool: ToolActivity): string {
  return tool.line.split(' ')[0] ?? ''
}

function toolInput(tool: ToolActivity): Record<string, unknown> {
  return (typeof tool.input === 'object' && tool.input !== null ? tool.input : {}) as Record<
    string,
    unknown
  >
}

function Diff({ lines }: { lines: ReturnType<typeof lineDiff> }) {
  if (lines.length === 0) return null
  const shown = lines.slice(0, TOOL_OUTPUT_LINES)
  const rest = lines.length - shown.length
  return (
    <pre
      data-selectable
      className="zt-scroll max-h-56 overflow-auto rounded-lg bg-card py-1 font-mono text-xs leading-normal whitespace-pre-wrap"
    >
      {shown.map((line, index) => (
        <div key={index} className={cn('px-2', TONE[line.kind])}>
          <span className="mr-1.5 inline-block w-[1ch] select-none">{MARK[line.kind]}</span>
          {line.text}
        </div>
      ))}
      {rest > 0 && <div className="px-2 text-muted-foreground">{moreLine(rest)}</div>}
    </pre>
  )
}

const TONE: Record<DiffLine['kind'], string> = {
  add: 'bg-added-surface text-added',
  remove: 'bg-removed-surface text-removed',
  same: 'text-muted-foreground',
}

const MARK: Record<DiffLine['kind'], string> = {
  add: '+',
  remove: '\u2212',
  same: ' ',
}
