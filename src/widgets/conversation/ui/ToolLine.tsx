import { personaOf } from '@/entities/agent-session'
import { AgentFace } from '@/entities/agent-session/ui/agent-face'
import { resultNote, toolShape } from '@/shared/lib/tool-shape/tool-shape'
import type { ToolActivity } from '@/entities/conversation'
import { ToolIcon } from '@/shared/graphics/tool-icon'

export function ToolLine({ tool }: { tool: ToolActivity }) {
  const name = tool.line.split(' ')[0] ?? ''
  const shape = toolShape(name, tool.input)
  const note = resultNote(shape, tool.result ? tool.result.stdout : null)
  const failed = tool.result?.isError === true

  return (
    <span className="flex min-w-0 items-baseline gap-1.5">
      <span className="w-3 flex-none translate-y-[2px]">
        {shape.kind === 'agent' ? (
          <AgentFace persona={personaOf(shape.subagentType)} size={12} />
        ) : (
          <ToolIcon shape={shape} />
        )}
      </span>
      <span className="min-w-0 truncate">{body(shape)}</span>
      {note && <span className="flex-none text-muted-foreground">{note}</span>}
      {failed && <span className="flex-none">failed</span>}
      {tool.result?.interrupted && <span className="flex-none text-muted-foreground">interrupted</span>}
    </span>
  )
}

function body(shape: ToolShape) {
  if (shape.kind === 'file') {
    return (
      <>
        {shape.dir && <span className="text-muted-foreground">{shape.dir}</span>}
        <span>{shape.name}</span>
      </>
    )
  }
  if (shape.kind === 'command') {
    return (
      <>
        <span className="text-muted-foreground">$ </span>
        <span>{shape.command}</span>
      </>
    )
  }
  if (shape.kind === 'search') {
    return (
      <>
        <span>{shape.pattern}</span>
        {shape.scope && <span className="text-muted-foreground"> · {shape.scope}</span>}
      </>
    )
  }
  if (shape.kind === 'web') return <span>{shape.label}</span>
  if (shape.kind === 'agent') {
    const persona = personaOf(shape.subagentType)
    return (
      <>
        <span>{persona.name}</span>
        {shape.description && <span className="text-muted-foreground"> · {shape.description}</span>}
      </>
    )
  }
  if (shape.kind === 'todo') return <span className="text-muted-foreground">Todo list</span>
  return <span>{shape.name}</span>
}

type ToolShape = ReturnType<typeof toolShape>
