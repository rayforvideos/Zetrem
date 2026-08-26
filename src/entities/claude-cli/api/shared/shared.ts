const STREAM_LINE_MAX = 120

export function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

const TARGET_KEYS = ['file_path', 'command', 'pattern', 'path', 'url', 'query'] as const

// A command that starts by walking to the project is not doing anything worth
// the width: the path can be longer than the line, and what the command
// actually does gets cut off the end.
export function withoutCd(command: string): string {
  // Only an absolute one. `cd packages/ui && pnpm build` says where the build
  // ran, and that is worth the width; the machine's own path is not.
  const cut = /^\s*cd\s+(?:'(?=[/~])[^']*'|"(?=[/~])[^"]*"|(?=[/~])[^;&|]+?)\s*(?:;|&&)\s*/
  return cut.test(command) ? command.replace(cut, '') : command
}

export function toolTarget(input: unknown): string {
  if (typeof input !== 'object' || input === null) return ''
  for (const key of TARGET_KEYS) {
    const value = (input as Record<string, unknown>)[key]
    if (typeof value !== 'string' || value.length === 0) continue
    return key === 'command' ? withoutCd(value) : value
  }
  return ''
}

export function toolLine(name: string, input: unknown): string {
  return `${name} ${toolTarget(input)}`.trim().slice(0, STREAM_LINE_MAX)
}

// A content array off the wire can carry a null element; reading .type off one
// throws and takes the whole line's parse with it.
export function blocksIn(content: unknown[]): Record<string, unknown>[] {
  return content.filter(
    (block): block is Record<string, unknown> => typeof block === 'object' && block !== null,
  )
}

export function resultText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return blocksIn(content)
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text as string)
      .join(' ')
  }
  return ''
}
