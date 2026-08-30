import { statusStore } from '@/entities/agent-session'
import { learnUsage } from '../session-probe/session-probe'
import { dueForUsage } from '../usage-due/usage-due'
import type { UsageAfter } from '../usage-due/usage-due.types'

export function readUsage(): void {
  void window.desk
    .sessionUsage()
    .then(learnUsage)
    .catch(() => learnUsage(null))
}

export function readUsageAfter(after: UsageAfter): void {
  if (!dueForUsage(statusStore.get().usageAtMs, Date.now(), after)) return
  readUsage()
}
