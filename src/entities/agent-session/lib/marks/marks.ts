import type { Mark } from '@/shared/graphics/work-trace/work-trace.types'
import type { Call } from '../../model/session.types'

export function marksOf(calls: Call[], nowMs: number, live: boolean): Mark[] {
  return calls.map((call) => {
    const open = call.endedAtMs === null
    const running = open && live
    const ms = open ? (running ? Math.max(0, nowMs - call.startedAtMs) : 0) : call.endedAtMs! - call.startedAtMs
    return { line: call.line, ms, failed: call.failed, running }
  })
}
