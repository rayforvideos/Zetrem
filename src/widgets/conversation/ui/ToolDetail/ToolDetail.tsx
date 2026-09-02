import type { ToolActivity } from '@/entities/conversation'
import { cn } from '@/shared/lib/cn'
import { toolNameOf, changeLines, ChangeDiff } from '@/entities/tool'
import { TOOL_OUTPUT_LINES } from '../../lib/limits/limits'

export function ToolDetail({ tool }: { tool: ToolActivity }) {
  const name = toolNameOf(tool.line)
  const input = toolInput(tool)

  if (name === 'Edit' || name === 'MultiEdit' || name === 'Write') {
    const groups = changeLines(name, tool.input)
    if (groups.length === 0) return null
    return <ChangeDiff groups={groups} maxLines={TOOL_OUTPUT_LINES} />
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
              // biome-ignore lint/suspicious/noArrayIndexKey: a todo carries no id, so the position is what tells two identical lines apart
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

function toolInput(tool: ToolActivity): Record<string, unknown> {
  return (typeof tool.input === 'object' && tool.input !== null ? tool.input : {}) as Record<
    string,
    unknown
  >
}
