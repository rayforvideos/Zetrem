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

// Which of their agents are on. Being one of theirs is enough — the only thing
// written down is what somebody turned off.
//
// It used to be the other way round: the enabled set was a list of names, and
// anything newly discovered wrote itself into it. That made the switches depend
// on the discovery list being right, which is how a name that should never have
// been there ended up switched on by itself.
export function allowedStock(stock: string[], off: string[]): string[] {
  const refused = new Set(off.map((name) => name.toLowerCase()))
  return stock.filter((name) => !refused.has(name.toLowerCase()))
}

// Records a switch. Only an off lands in the list; an on takes its name back out.
export function offStock(off: string[], name: string, on: boolean): string[] {
  const low = name.toLowerCase()
  const without = off.filter((one) => one.toLowerCase() !== low)
  return on ? without : [...without, name]
}
