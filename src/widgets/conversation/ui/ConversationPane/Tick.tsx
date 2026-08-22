import { useState } from 'react'
import type { ToolActivity } from '@/entities/conversation'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { TOOL_OUTPUT_LINES, moreLine } from '../../lib/limits'
import { spawnResult, withoutPlumbing } from '../../lib/plumbing/plumbing'
import { ToolDetail } from '../ToolDetail/ToolDetail'
import { ToolLine } from '../ToolLine'

export function tickOpen(override: boolean | null): boolean {
  return override ?? true
}

export function Tick({ tool, live }: { tool: ToolActivity; live: boolean }) {
  const [override, setOverride] = useState<boolean | null>(null)
  const open = tickOpen(override)
  const said = [tool.result?.stdout, tool.result?.stderr].filter(Boolean).join('\n')
  const output = spawnResult(tool.line) ? withoutPlumbing(said) : said
  const lines = output.split('\n')
  const shown = lines.slice(0, TOOL_OUTPUT_LINES).join('\n')
  const rest = lines.length - TOOL_OUTPUT_LINES
  const detail = ToolDetail({ tool })
  const expandable = tool.result !== null || detail !== null

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
      </Button>
      {open && (
        <div className="flex flex-col gap-1">
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
