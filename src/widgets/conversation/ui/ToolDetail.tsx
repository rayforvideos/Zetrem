import type { ToolActivity } from '@/pages/workspace/model/conversation'
import { cn } from '@/shared/lib/cn'
import { lineDiff } from '../lib/diff'
import { TOOL_OUTPUT_LINES, moreLine } from '../lib/limits'

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
                'flex items-baseline gap-1.5 font-mono text-[10.5px] leading-normal',
                status === 'completed' && 'line-through opacity-45',
                status === 'in_progress' && 'opacity-100',
                status !== 'completed' && status !== 'in_progress' && 'opacity-70',
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
    <pre className="zt-scroll max-h-56 overflow-auto border-l border-current/15 pl-2 font-mono text-[10.5px] leading-normal whitespace-pre-wrap">
      {shown.map((line, index) => (
        <div key={index} className={line.kind === 'same' ? 'opacity-45' : 'opacity-100'}>
          <span className="mr-1.5 inline-block w-[1ch] opacity-70">
            {line.kind === 'add' ? '+' : line.kind === 'remove' ? '−' : ' '}
          </span>
          {line.text}
        </div>
      ))}
      {rest > 0 && <div className="opacity-70">{moreLine(rest)}</div>}
    </pre>
  )
}
