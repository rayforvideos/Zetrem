import { ORCHESTRATOR } from '../roster-lock/roster-lock'

export function stockAgents(knownAgents: string[], ourNames: string[]): string[] {
  const ours = new Set([...ourNames, ORCHESTRATOR])
  const seen = new Set<string>()
  const found: string[] = []
  for (const name of knownAgents) {
    if (name.length === 0 || ours.has(name) || seen.has(name)) continue
    if (name.includes(':')) continue
    seen.add(name)
    found.push(name)
  }
  return found.sort((a, b) => a.localeCompare(b))
}

export function allowedStock(stock: string[], enabled: string[]): string[] {
  const wanted = new Set(enabled)
  return stock.filter((name) => wanted.has(name))
}
