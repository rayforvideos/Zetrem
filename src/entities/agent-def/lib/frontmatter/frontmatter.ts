import type { AgentDef, AgentDefDraft } from './frontmatter.types'

const FENCE = '---'

export function parseAgentDef(
  text: string,
  source: AgentDef['source'],
  path: string,
): AgentDef | null {
  const lines = text.split('\n')
  if (lines[0]?.trim() !== FENCE) return null

  const close = lines.findIndex((line, index) => index > 0 && line.trim() === FENCE)
  if (close === -1) return null

  const fields = readFields(lines.slice(1, close))
  const name = fields.get('name')
  if (typeof name !== 'string' || name.length === 0) return null

  const model = fields.get('model')
  const character = fields.get('character')
  const tools = fields.get('tools') ?? fields.get('allowed-tools')
  const knowledge = fields.get('knowledge')

  return {
    name,
    description: typeof fields.get('description') === 'string' ? (fields.get('description') as string) : '',
    model: typeof model === 'string' && model.length > 0 ? model : null,
    character: typeof character === 'string' && character.length > 0 ? character : null,
    tools: Array.isArray(tools) ? tools : typeof tools === 'string' ? splitList(tools) : [],
    knowledge: Array.isArray(knowledge)
      ? knowledge
      : typeof knowledge === 'string'
        ? splitList(knowledge)
        : [],
    prompt: ownWords(lines.slice(close + 1).join('\n')),
    source,
    path,
  }
}

export const READING_MARK = '<!-- zetrem:knowledge -->'

export function toAgentFile(draft: AgentDefDraft): string {
  const head = [FENCE, `name: ${draft.name}`, `description: ${quote(draft.description)}`]
  if (draft.model !== null) head.push(`model: ${draft.model}`)
  if (draft.character !== null) head.push(`character: ${draft.character}`)
  if (draft.tools.length > 0) head.push(`tools: ${draft.tools.join(', ')}`)
  if (draft.knowledge.length > 0) head.push(`knowledge: ${draft.knowledge.join(', ')}`)
  head.push(FENCE, '')
  return `${head.join('\n')}${draft.prompt.trim()}\n${readingOrder(draft.knowledge)}`
}

// The brief as the CLI must receive it. The reading order is part of what the
// teammate is told, so it has to ride in the prompt: --agents carries no other
// channel for it, and the file this app writes is its own store, not the CLI's.
export function briefOf(prompt: string, knowledge: string[]): string {
  if (knowledge.length === 0) return prompt.trim()
  return [prompt.trim(), '', ...readingLines(knowledge)].join('\n').trimEnd()
}

function readingLines(knowledge: string[]): string[] {
  return [
    'Read these before you start, and work by what they say:',
    ...knowledge.map((path) => `- ${path}`),
  ]
}

// The file keeps a marker so parsing can tell the brief from the reading order.
// What the CLI is sent does not: the marker is our plumbing, not an instruction.
function readingOrder(knowledge: string[]): string {
  if (knowledge.length === 0) return ''
  return ['', READING_MARK, ...readingLines(knowledge), ''].join('\n')
}

function ownWords(body: string): string {
  const mark = body.indexOf(READING_MARK)
  return (mark === -1 ? body : body.slice(0, mark)).trim()
}

export function fileNameOf(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug.length > 0 ? slug : 'agent'}.md`
}

function readFields(lines: string[]): Map<string, string | string[]> {
  const fields = new Map<string, string | string[]>()
  let listKey: string | null = null
  let list: string[] = []

  const flush = (): void => {
    if (listKey !== null) fields.set(listKey, list)
    listKey = null
    list = []
  }

  for (const line of lines) {
    const item = /^\s*-\s+(.*)$/.exec(line)
    if (item !== null && listKey !== null) {
      list.push(unquote(item[1] ?? ''))
      continue
    }
    const pair = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line)
    if (pair === null) continue
    flush()
    const key = (pair[1] ?? '').toLowerCase()
    const value = (pair[2] ?? '').trim()
    if (value.length === 0) listKey = key
    else fields.set(key, unquote(value))
  }
  flush()
  return fields
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

function unquote(value: string): string {
  const trimmed = value.trim()
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  return quoted ? trimmed.slice(1, -1) : trimmed
}

function quote(value: string): string {
  return /[:#]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value
}
