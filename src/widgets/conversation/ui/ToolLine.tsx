import { personaOf } from '@/entities/agent-session'
import { AgentSprite } from '@/entities/agent-session/ui/AgentSprite/AgentSprite'
import { resultNote, toolShape } from '@/shared/lib/tool-shape/tool-shape'
import type { ToolActivity } from '@/entities/conversation'
import { ToolIcon } from '@/shared/graphics/tool-icon'
import { Item, ItemContent, ItemMedia } from '@/shared/ui/item'
import { changeCount } from '../lib/change-count/change-count'
import { noteParts } from '../lib/tool-note/tool-note'

export function ToolLine({ tool }: { tool: ToolActivity }) {
  const name = tool.line.split(' ')[0] ?? ''
  const shape = toolShape(name, tool.input)
  const failed = tool.result?.isError === true
  const { note, failure } = noteParts(
    resultNote(shape, tool.result ? tool.result.stdout : null),
    failed,
  )
  const changed = changeCount(tool)

  return (
    <Item size="sm" className="w-full min-w-0 gap-2.5 px-0 py-0 text-xs">
      <ItemMedia className="size-4 self-start">
        {shape.kind === 'agent' ? (
          <AgentSprite subagentType={shape.subagentType} size={16} />
        ) : (
          <ToolIcon shape={shape} />
        )}
      </ItemMedia>
      <ItemContent className="min-w-0 flex-row flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span className="min-w-0 [overflow-wrap:anywhere]">{body(shape)}</span>
        {changed !== null && (
          <span data-change className="flex-none tabular-nums">
            {changed.added > 0 && <span className="text-added">+{changed.added}</span>}
            {changed.removed > 0 && (
              <span className="ml-1 text-removed">
                {'−'}
                {changed.removed}
              </span>
            )}
          </span>
        )}
        {note && <span className="flex-none text-muted-foreground">{note}</span>}
        {failure && (
          <span data-failed className="min-w-0 text-removed [overflow-wrap:anywhere]">
            {failure}
          </span>
        )}
        {tool.result?.interrupted && (
          <span className="flex-none text-muted-foreground">interrupted</span>
        )}
      </ItemContent>
    </Item>
  )
}

function body(shape: ToolShape) {
  switch (shape.kind) {
    case 'file':
      return (
        <>
          {shape.dir && <span className="text-muted-foreground">{shape.dir}</span>}
          <span>{shape.name}</span>
        </>
      )
    case 'command':
      return (
        <>
          <span className="text-muted-foreground">$ </span>
          <span>{shape.command}</span>
        </>
      )
    case 'search':
      return (
        <>
          <span>{shape.pattern}</span>
          {shape.scope && <span className="text-muted-foreground"> · {shape.scope}</span>}
        </>
      )
    case 'web':
      return <span>{shape.label}</span>
    case 'agent': {
      const persona = personaOf(shape.subagentType)
      return (
        <>
          <span>{persona.name}</span>
          {shape.description && (
            <span className="text-muted-foreground"> · {shape.description}</span>
          )}
        </>
      )
    }
    case 'todo':
      return <span className="text-muted-foreground">Todo list</span>
    default:
      return <span>{shape.name}</span>
  }
}

type ToolShape = ReturnType<typeof toolShape>
