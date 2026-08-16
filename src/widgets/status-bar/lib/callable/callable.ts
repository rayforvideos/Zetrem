const ENTRY = /^Agent\((.*)\)$/

export function callableAgents(tools: string[], agents: string[]): number {
  if (tools.includes('Task')) return agents.length
  const named = new Set<string>()
  for (const tool of tools) {
    const found = ENTRY.exec(tool)
    if (found === null) continue
    for (const name of (found[1] ?? '').split(',')) {
      const tidy = name.trim()
      if (tidy.length > 0) named.add(tidy)
    }
  }
  return named.size
}
