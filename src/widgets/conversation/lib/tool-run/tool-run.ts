import type { ToolActivity } from '@/entities/conversation'
import type { Mark } from '@/shared/graphics/WorkTrace/work-trace/work-trace.types'
import { tally } from '@/shared/lib/tool-line/tool-line'
import { plural } from '@lingui/core/macro'

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
    counted.read > 0 ? plural(counted.read, { one: '# file read', other: '# files read' }) : null,
    counted.wrote > 0
      ? plural(counted.wrote, { one: '# file changed', other: '# files changed' })
      : null,
    counted.ran > 0 ? plural(counted.ran, { one: '# command run', other: '# commands run' }) : null,
    counted.searched > 0 ? plural(counted.searched, { one: '# search', other: '# searches' }) : null,
  ].filter((part) => part !== null)
  if (parts.length === 0) return plural(tools.length, { one: '# step', other: '# steps' })
  return parts.join(' · ')
}
