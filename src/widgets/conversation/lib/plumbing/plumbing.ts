// Notes the CLI writes for the model, not part of what the tool did.
const ASIDES = [
  'agentid:',
  'output_file:',
  'do not read or tail this file',
  'do not duplicate this agent',
  'the agent is working in the background',
  'you know nothing about its results',
  'continue other work or respond to the user',
  'is the full subagent jsonl transcript',
  'will overflow your context',
  'progress, say the agent is still running',
  'a completion notification',
  'do not report, assume, or predict them',
  'meantime.',
  'with the same files or topics it is using',
]

function anAside(line: string): boolean {
  const said = line.trim().toLowerCase()
  if (said.length === 0) return false
  return ASIDES.some((mark) => said.includes(mark))
}

// The note can also ride in brackets mid-sentence, so it comes off before anything
// is judged line by line.
function withoutBrackets(text: string): string {
  return text.replace(/\s*\((?=[^()]*internal metadata)[^()]*\)/gi, '')
}

function withoutUsage(text: string): string {
  return text.replace(/<usage>[\s\S]*?<\/usage>/g, '')
}

// Only a spawn writes these notes. Over every tool result the filter would eat a
// build log line that happens to say output_file.
const SPAWNS = ['Agent', 'Task']

export function spawnResult(line: string): boolean {
  return SPAWNS.includes(line.split(' ')[0] ?? '')
}

export function withoutPlumbing(text: string): string {
  const kept: string[] = []
  for (const line of withoutBrackets(withoutUsage(text)).split('\n')) {
    if (anAside(line)) continue
    if (line.trim().length === 0 && (kept.length === 0 || kept.at(-1)?.trim().length === 0))
      continue
    kept.push(line)
  }
  while (kept.length > 0 && kept.at(-1)?.trim().length === 0) kept.pop()
  return kept.join('\n')
}
