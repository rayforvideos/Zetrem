import type { ToolActivity } from '@/entities/conversation'
import type { AnswerPart } from './answer.types'

// A turn's text and tools, back in the order they happened. Each tool knows
// how much text had been said when it ran; tools that ran at the same point
// form one run, and the text between two runs is one block. A tool with no
// place recorded came from a file saved before that was kept, and ran after
// all the text. The joins between blocks were made with blank lines, so a
// block is trimmed before it is drawn.
export function partsOf(text: string, tools: ToolActivity[]): AnswerPart[] {
  const parts: AnswerPart[] = []
  let said = 0
  let run: ToolActivity[] = []
  let runAt = 0

  function flushRun(): void {
    if (run.length === 0) return
    parts.push({ kind: 'run', tools: run })
    run = []
  }

  function flushText(upTo: number): void {
    const block = text.slice(said, upTo).trim()
    said = Math.max(said, upTo)
    if (block.length > 0) parts.push({ kind: 'text', text: block })
  }

  for (const tool of tools) {
    const at = Math.min(Math.max(tool.at ?? text.length, said), text.length)
    if (run.length > 0 && at !== runAt) flushRun()
    if (run.length === 0) {
      flushText(at)
      runAt = at
    }
    run.push(tool)
  }
  flushRun()
  flushText(text.length)
  return parts
}
