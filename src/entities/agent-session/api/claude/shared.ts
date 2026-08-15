export const STREAM_LINE_MAX = 120

const TARGET_KEYS = ['file_path', 'command', 'pattern', 'path', 'url', 'query'] as const

export function toolTarget(input: unknown): string {
  if (typeof input !== 'object' || input === null) return ''
  for (const key of TARGET_KEYS) {
    const value = (input as Record<string, unknown>)[key]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return ''
}

export function toolLine(name: string, input: unknown): string {
  return `${name} ${toolTarget(input)}`.trim().slice(0, STREAM_LINE_MAX)
}

export function resultText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return (content as Record<string, unknown>[])
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text as string)
      .join(' ')
  }
  return ''
}
