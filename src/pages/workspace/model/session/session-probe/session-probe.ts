import type { ChatStatus } from '@/entities/agent-session'
import { accountStatus, readUsage } from '@/entities/agent-session'
import { parseClaudeLine } from '@/entities/claude-cli'

export function learnSession(status: ChatStatus | null, line: string | null): void {
  if (status === null || line === null) return
  if (status.get().session !== null) return
  for (const turn of parseClaudeLine(line)) {
    if (turn.type === 'session') status.learnProbe(turn.session)
  }
}

export function learnKeptUsage(report: string | null): void {
  if (report === null) return
  if (accountStatus.get().limits.length > 0) return
  for (const limit of readUsage(report)) {
    accountStatus.applyLimit(limit)
  }
  accountStatus.usageKept()
}

export function learnUsage(report: string | null): void {
  if (report === null) {
    accountStatus.usageUnreadable()
    return
  }
  for (const limit of readUsage(report)) {
    accountStatus.applyLimit(limit)
  }
  accountStatus.usageRead(Date.now())
}
