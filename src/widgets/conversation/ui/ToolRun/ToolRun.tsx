import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ToolActivity } from '@/entities/conversation'
import { WorkTrace } from '@/entities/tool'
import { Button } from '@/shared/ui/button'
import { marksOfTools, runFailed, splitRun, summarise } from '../../lib/tool-run/tool-run'
import { Tick, tickOpen } from '../ConversationPane/Tick'

type ToolRunProps = {
  tools: ToolActivity[]
  live: boolean
  nowMs: number
  // The project the conversation is about, so a path inside it can be shown
  // the way the project speaks it.
  project: string | null
}

export function ToolRun({ tools, live, nowMs, project }: ToolRunProps) {
  const [override, setOverride] = useState<boolean | null>(null)
  const { folded, shown } = splitRun(tools)
  const lastIndex = shown.length - 1
  // A row opens itself when it failed. A fold shut over that row takes the
  // failure back off the screen, so the fold answers to the same rule.
  const open = tickOpen(override, runFailed(folded))

  return (
    <div className="-mx-1.5 flex flex-col gap-0.5">
      {folded.length > 0 && (
        <>
          <Button
            variant="quiet"
            size="bare"
            onClick={() => setOverride(!open)}
            aria-expanded={open}
            data-run={folded.length}
            className="h-auto w-full min-w-0 justify-start gap-2.5 rounded-md px-1.5 py-1.5 text-left text-xs text-muted-foreground hover:bg-card"
          >
            {open ? (
              <ChevronDown className="size-3.5 flex-none" />
            ) : (
              <ChevronRight className="size-3.5 flex-none" />
            )}
            <span className="flex-none">{summarise(folded)}</span>
            <span className="min-w-0 flex-1">
              <WorkTrace marks={marksOfTools(folded, nowMs)} />
            </span>
          </Button>
          {open && (
            <div className="flex flex-col gap-0.5 border-l border-border pl-2.5">
              {folded.map((tool, at) => (
                <Tick
                  // biome-ignore lint/suspicious/noArrayIndexKey: the CLI names a call when it can; the index is what separates two that look alike
                  key={`${at}-${tool.toolUseId ?? tool.line}`}
                  tool={tool}
                  live={false}
                  project={project}
                />
              ))}
            </div>
          )}
        </>
      )}
      {shown.map((tool, at) => (
        <Tick
          // biome-ignore lint/suspicious/noArrayIndexKey: the CLI names a call when it can; the index is what separates two that look alike
          key={`${at}-${tool.toolUseId ?? tool.line}`}
          tool={tool}
          live={live && at === lastIndex}
          project={project}
        />
      ))}
    </div>
  )
}
