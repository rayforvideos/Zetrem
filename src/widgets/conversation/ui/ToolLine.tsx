import { personaOf } from '@/entities/agent-session'
import { AgentFace } from '@/shared/ui/agent-face'
import { resultNote, toolShape } from '@/shared/lib/tool-shape'
import type { ToolActivity } from '@/pages/workspace/model/conversation'
import { ToolIcon } from '@/shared/ui/tool-icon'

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
      {note && <span className="flex-none opacity-45">{note}</span>}
      {failed && <span className="flex-none">실패</span>}
      {tool.result?.interrupted && <span className="flex-none opacity-45">중단됨</span>}
    </span>
  )
}

function body(shape: ToolShape) {
  if (shape.kind === 'file') {
    return (
      <>
        {shape.dir && <span className="opacity-45">{shape.dir}</span>}
        <span>{shape.name}</span>
      </>
    )
  }
  if (shape.kind === 'command') {
    return (
      <>
        <span className="opacity-45">$ </span>
        <span>{shape.command}</span>
      </>
    )
  }
  if (shape.kind === 'search') {
    return (
      <>
        <span>{shape.pattern}</span>
        {shape.scope && <span className="opacity-45"> · {shape.scope}</span>}
      </>
    )
  }
  if (shape.kind === 'web') return <span>{shape.label}</span>
  if (shape.kind === 'agent') {
    const persona = personaOf(shape.subagentType)
    return (
      <>
        <span>{persona.name}</span>
        {shape.description && <span className="opacity-45"> · {shape.description}</span>}
      </>
    )
  }
  if (shape.kind === 'todo') return <span className="opacity-70">할 일 정리</span>
  return <span>{shape.name}</span>
}

type ToolShape = ReturnType<typeof toolShape>
