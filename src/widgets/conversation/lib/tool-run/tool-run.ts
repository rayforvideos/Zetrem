import type { ToolActivity } from '@/entities/conversation'
import type { Mark } from '@/shared/graphics/work-trace/work-trace.types'
import { tally } from '@/shared/lib/tool-line/tool-line'

export const RUN_TAIL = 4

export function splitRun(
  tools: ToolActivity[],
  tail = RUN_TAIL,
): { folded: ToolActivity[]; shown: ToolActivity[] } {
  if (tools.length <= tail + 1) return { folded: [], shown: tools }
  return { folded: tools.slice(0, -tail), shown: tools.slice(-tail) }
}

export function marksOfTools(tools: ToolActivity[], nowMs: number): Mark[] {
  return tools.map((tool) => {
    const running = tool.endedAtMs === null && tool.result === null
    const ended = tool.endedAtMs ?? (running ? nowMs : tool.startedAtMs)
    return {
      line: tool.line,
      ms: Math.max(0, ended - tool.startedAtMs),
      failed: tool.result?.isError === true,
      running,
    }
  })
}

export function summarise(tools: ToolActivity[]): string {
  const counted = tally(tools.map((tool) => tool.line))
  const parts = [
    phrase(counted.read, 'file read', 'files read'),
    phrase(counted.wrote, 'file changed', 'files changed'),
    phrase(counted.ran, 'command run', 'commands run'),
    phrase(counted.searched, 'search', 'searches'),
  ].filter((part) => part !== null)
  if (parts.length === 0) return `${tools.length} steps`
  return parts.join(' · ')
}

function phrase(count: number, one: string, many: string): string | null {
  if (count === 0) return null
  return `${count} ${count === 1 ? one : many}`
}
