import { t } from '@lingui/core/macro'
import type { AgentSession } from '@/entities/agent-session'

function tally(sessions: AgentSession[], status: AgentSession['status']): number {
  return sessions.filter((session) => session.status === status).length
}

export function headcount(sessions: AgentSession[]): string {
  const parts: string[] = []
  const working = tally(sessions, 'working')
  const waiting = tally(sessions, 'waiting')
  const reported = tally(sessions, 'reported')
  if (working > 0) parts.push(t`${working} working`)
  if (waiting > 0) parts.push(t`${waiting} waiting on you`)
  if (reported > 0) parts.push(t`${reported} reported back`)
  const out = sessions.length
  if (parts.length === 0) return t`Your crew · ${out} out`
  const what = parts.join(' · ')
  return t`Your crew · ${what}`
}
