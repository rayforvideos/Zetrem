import type { ChatSpend, Transcript } from '@/entities/conversation'

// A tool result landing inside an existing turn, or a spend update, changes
// neither the turn count nor the last turn's text, so the stamp folds those in.
export function stampOf(transcript: Transcript): string {
  const turns = transcript.turns
  let tools = 0
  let doneTools = 0
  for (const turn of turns) {
    tools += turn.tools.length
    for (const tool of turn.tools) {
      if (tool.result !== null) doneTools += 1
    }
  }
  const lastText = turns.at(-1)?.text ?? ''
  return [
    transcript.id,
    transcript.sessionId,
    turns.length,
    lastText,
    tools,
    doneTools,
    spendPart(transcript.spend),
  ].join(':')
}

function spendPart(spend: ChatSpend | null): string {
  return spend === null ? '' : `${spend.usd}:${spend.turns}`
}
