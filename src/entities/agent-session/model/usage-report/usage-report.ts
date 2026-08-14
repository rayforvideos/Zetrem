import type { RateLimit } from '../../api/claude/status/status.types'

const LINE = /^Current (session|week)(?: \(([^)]+)\))?:\s*(\d+)%\s*used(?:\s*·\s*resets\s+(.+?))?\s*$/

const HEAVY = 0.85

function kindOf(span: string, model: string | null): string {
  if (span === 'session') return 'five_hour'
  if (model === null || model.toLowerCase() === 'all models') return 'seven_day'
  return `seven_day_${model.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`
}

function resetsOf(said: string | undefined): string | undefined {
  if (said === undefined) return undefined
  const plain = said.replace(/\s*\([^)]*\)\s*$/, '').trim()
  return plain.length > 0 ? plain : undefined
}

export function readUsage(report: string): RateLimit[] {
  const found: RateLimit[] = []
  const held = new Set<string>()
  for (const raw of report.split('\n')) {
    const match = LINE.exec(raw.trim())
    if (match === null) continue
    const utilization = Number(match[3]) / 100
    const kind = kindOf(match[1]!, match[2] ?? null)
    if (held.has(kind)) continue
    held.add(kind)
    found.push({
      kind,
      utilization,
      resetsAtMs: 0,
      resetsText: resetsOf(match[4]),
      overage: false,
      status: utilization >= HEAVY ? 'allowed_warning' : 'allowed',
    })
  }
  return found
}
