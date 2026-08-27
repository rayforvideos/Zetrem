import { ORCHESTRATOR } from '@/entities/claude-cli/@x/teammate'

export function stockAgents(
  knownAgents: string[],
  ourNames: string[],
  authored: string[] = [],
): string[] {
  const ours = new Set([...ourNames, ORCHESTRATOR])
  const written = new Set(authored.map((name) => name.toLowerCase()))
  const found = new Set(
    knownAgents.filter(
      (name) =>
        name.length > 0 &&
        !ours.has(name) &&
        !name.includes(':') &&
        !written.has(name.toLowerCase()),
    ),
  )
  return [...found].sort((a, b) => a.localeCompare(b))
}

// Being one of theirs is enough to be on: the only thing written down is what was turned off.
export function allowedStock(stock: string[], off: string[]): string[] {
  const refused = new Set(off.map((name) => name.toLowerCase()))
  return stock.filter((name) => !refused.has(name.toLowerCase()))
}

export function offStock(off: string[], name: string, on: boolean): string[] {
  const low = name.toLowerCase()
  const without = off.filter((one) => one.toLowerCase() !== low)
  return on ? without : [...without, name]
}
