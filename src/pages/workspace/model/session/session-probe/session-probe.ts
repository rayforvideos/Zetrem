import { readUsage, statusStore } from '@/entities/agent-session'
import { parseClaudeLine } from '@/entities/claude-cli'

export function learnSession(line: string | null): void {
  if (line === null) return
  if (statusStore.get().session !== null) return
  for (const turn of parseClaudeLine(line)) {
    if (turn.type === 'session') statusStore.learnProbe(turn.session)
  }
}

export function learnKeptUsage(report: string | null): void {
  if (report === null) return
  if (statusStore.get().limits.length > 0) return
  for (const limit of readUsage(report)) {
    statusStore.apply({ type: 'limit', limit })
  }
  statusStore.usageKept()
}

export function learnUsage(report: string | null): void {
  if (report === null) {
    statusStore.usageUnreadable()
    return
  }
  for (const limit of readUsage(report)) {
    statusStore.apply({ type: 'limit', limit })
  }
  statusStore.usageRead(Date.now())
}
