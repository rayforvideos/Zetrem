import type { RateLimit } from '@/entities/claude-cli'

const LINE =
  /^Current (session|week)(?: \(([^)]+)\))?:\s*(\d+)%\s*used(?:\s*·\s*resets\s+(.+?))?\s*$/

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

export function readUsage(report: string, nowMs = Date.now()): RateLimit[] {
  const found: RateLimit[] = []
  const held = new Set<string>()
  for (const raw of report.split('\n')) {
    const match = LINE.exec(raw.trim())
    if (match === null) continue
    const utilization = Number(match[3]) / 100
    const kind = kindOf(match[1]!, match[2] ?? null)
    if (held.has(kind)) continue
    held.add(kind)
    const resets = resetsOf(match[4])
    found.push({
      kind,
      utilization,
      resetsAtMs: resetsAtOf(resets, nowMs),
      resetsText: resets,
      overage: false,
      status: utilization >= HEAVY ? 'allowed_warning' : 'allowed',
    })
  }
  return found
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

const WHEN = /^([a-z]{3})[a-z]*\s+(\d{1,2})\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i

export function resetsAtOf(said: string | undefined, nowMs: number): number {
  if (said === undefined) return 0
  const match = WHEN.exec(said.trim())
  if (match === null) return 0
  const month = MONTHS.indexOf(match[1]!.toLowerCase())
  if (month === -1) return 0
  const day = Number(match[2])
  const meridiem = match[5]?.toLowerCase()
  let hour = Number(match[3])
  if (meridiem === 'pm' && hour < 12) hour += 12
  if (meridiem === 'am' && hour === 12) hour = 0
  const minute = Number(match[4] ?? 0)
  const now = new Date(nowMs)
  const at = new Date(now.getFullYear(), month, day, hour, minute, 0, 0).getTime()
  if (at < nowMs - 30 * 24 * 3_600_000) {
    return new Date(now.getFullYear() + 1, month, day, hour, minute, 0, 0).getTime()
  }
  return at
}
