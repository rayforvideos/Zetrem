import type { AgentSession } from '@/entities/agent-session'

function tally(sessions: AgentSession[], status: AgentSession['status']): number {
  return sessions.filter((session) => session.status === status).length
}

export function headcount(sessions: AgentSession[]): string {
  const parts: string[] = []
  const working = tally(sessions, 'working')
  const waiting = tally(sessions, 'waiting')
  const reported = tally(sessions, 'reported')
  if (working > 0) parts.push(`${working} working`)
  if (waiting > 0) parts.push(`${waiting} waiting on you`)
  if (reported > 0) parts.push(`${reported} reported back`)
  if (parts.length === 0) return `Your crew · ${sessions.length} out`
  return `Your crew · ${parts.join(' · ')}`
}
