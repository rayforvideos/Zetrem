import type { ToolActivity } from '@/entities/conversation'
import { Markdown } from '@/shared/markdown/Markdown/Markdown'
import { partsOf } from '../../lib/answer/answer'
import { ToolRun } from '../ToolRun/ToolRun'

type AnswerProps = {
  text: string
  tools: ToolActivity[]
  live: boolean
  nowMs: number
  project: string | null
}

// The words and the tool runs of one turn, in the order they happened: a run
// sits between the words said before it and the words said after. Only the
// last run can still be going.
export function Answer({ text, tools, live, nowMs, project }: AnswerProps) {
  const parts = partsOf(text, tools)
  const lastRun = parts.findLastIndex((part) => part.kind === 'run')
  return (
    <>
      {parts.map((part, at) =>
        part.kind === 'text' ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: parts only grow at the end while a turn is live
          <Markdown key={at} text={part.text} className="text-base leading-[1.72]" />
        ) : (
          <ToolRun
            // biome-ignore lint/suspicious/noArrayIndexKey: parts only grow at the end while a turn is live
            key={at}
            tools={part.tools}
            live={live && at === lastRun}
            nowMs={nowMs}
            project={project}
          />
        ),
      )}
    </>
  )
}
