import { useState } from 'react'
import type { ToolActivity } from '@/entities/conversation'
import { heldCommand, toolNameOf, toolShape } from '@/entities/tool'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { TOOL_OUTPUT_LINES, heldLine, moreLine } from '../../lib/limits/limits'
import { spawnResult, withoutPlumbing } from '../../lib/plumbing/plumbing'
import { ToolDetail } from '../ToolDetail/ToolDetail'
import { ToolLine } from '../ToolLine/ToolLine'

export function tickOpen(override: boolean | null, failed: boolean): boolean {
  return override ?? failed
}

export function Tick({ tool, live }: { tool: ToolActivity; live: boolean }) {
  const [override, setOverride] = useState<boolean | null>(null)
  const failed = tool.result?.isError === true
  const open = tickOpen(override, failed)
  const said = [tool.result?.stdout, tool.result?.stderr].filter(Boolean).join('\n')
  const output = spawnResult(tool.line) ? withoutPlumbing(said) : said
  const lines = output.split('\n')
  const shown = lines.slice(0, TOOL_OUTPUT_LINES).join('\n')
  const rest = lines.length - TOOL_OUTPUT_LINES
  const detail = ToolDetail({ tool })
  const shape = toolShape(toolNameOf(tool.line), tool.input)
  // The row shows a command's first line and nothing more, so the rest of a
  // script is only readable by opening the row, result or no result yet.
  const command = shape.kind === 'command' ? heldCommand(shape.command) : null
  const expandable = tool.result !== null || detail !== null || command !== null
  const held = output.length > 0 ? lines.length : 0

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="quiet"
        size="bare"
        onClick={() => setOverride(!open)}
        disabled={!expandable}
        aria-expanded={expandable && open}
        data-tick={tool.toolUseId ?? tool.line}
        className={cn(
          'h-auto w-full min-w-0 justify-start rounded-md px-1.5 py-1 text-left font-mono text-xs leading-normal whitespace-normal text-muted-foreground hover:bg-card disabled:opacity-100 disabled:hover:bg-transparent',
          live && 'text-foreground',
        )}
      >
        <ToolLine tool={tool} />
        {!open && held > 0 && (
          <span className="ml-auto flex-none pl-2 text-muted-foreground/70 tabular-nums">
            {heldLine(held)}
          </span>
        )}
      </Button>
      {open && (
        <div className="flex flex-col gap-1">
          {command !== null && (
            <pre
              data-command
              className="rounded-lg bg-card p-2.5 font-mono text-xs leading-normal whitespace-pre-wrap [overflow-wrap:anywhere]"
            >
              {command}
            </pre>
          )}
          {detail}
          {output.length > 0 && (
            <pre className="rounded-lg bg-card p-2.5 font-mono text-xs leading-normal whitespace-pre-wrap [overflow-wrap:anywhere] text-muted-foreground">
              {shown}
              {rest > 0 ? `\n${moreLine(rest)}` : ''}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
