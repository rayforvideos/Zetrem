import { AgentSprite, personaOf } from '@/entities/teammate'
import { toolShape } from '@/entities/tool'
import type { ToolShape } from '@/entities/tool'
import type { ToolActivity } from '@/entities/conversation'
import { ToolIcon, changeCount, firstLineOf } from '@/entities/tool'
import { cn } from '@/shared/lib/cn'
import { Item, ItemContent, ItemMedia } from '@/shared/ui/item'
import { failureNote } from '../../lib/tool-note/tool-note'
import { nearShape } from '../../lib/tool-path/tool-path'
import { toolNameOf } from '@/entities/tool'
import { t } from '@lingui/core/macro'

export function ToolLine({ tool, project }: { tool: ToolActivity; project: string | null }) {
  const name = toolNameOf(tool.line)
  const shape = nearShape(toolShape(name, tool.input), project)
  const failed = tool.result?.isError === true
  const said = tool.result === null ? '' : [tool.result.stdout, tool.result.stderr].join('\n')
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
      <ItemContent
        className={cn(
          'min-w-0 flex-row flex-wrap items-baseline gap-x-1.5 gap-y-0.5',
          // Handing work to a teammate is a different order of thing from
          // running ls, so the row it makes is read a step above a tool row.
          shape.kind === 'agent' && 'font-sans text-sm font-medium text-foreground',
        )}
      >
        <span
          className={cn(
            'min-w-0',
            // A command is the one input with no length to it, so its row is
            // held to a single line and opened when the whole of it is wanted.
            shape.kind === 'command' ? 'truncate' : '[overflow-wrap:anywhere]',
          )}
        >
          {body(shape)}
        </span>
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
        {failed && (
          <span data-failed className="min-w-0 text-removed [overflow-wrap:anywhere]">
            {failureNote(said)}
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
          <span>{firstLineOf(shape.command)}</span>
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
      return <span className="text-muted-foreground">{t`Todo list`}</span>
    default:
      return <span>{shape.name}</span>
  }
}
