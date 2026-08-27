import { useEffect, useRef } from 'react'
import type { RunConfig } from '@/entities/claude-cli'
import { statusStore } from '@/entities/agent-session'
import { learnKeptUsage, learnSession, learnUsage } from './session-probe/session-probe'
import { dueForUsage } from './usage-due/usage-due'

const TICK_MS = 60_000

function readUsage(): void {
  void window.desk
    .sessionUsage()
    .then(learnUsage)
    .catch(() => learnUsage(null))
}

export function useSessionProbe(
  config: Omit<RunConfig, 'persona'>,
  wanted: boolean,
  project: string | null,
  awake = false,
  busy = false,
): void {
  const held = useRef(config)

  useEffect(() => {
    held.current = config
  })

  useEffect(() => {
    if (!wanted) return
    void window.desk
      .keptUsage()
      .then(learnKeptUsage)
      .catch(() => undefined)
    readUsage()
  }, [wanted])

  // The probe runs claude in the project, so a first launch asks before one is
  // picked and learns nothing of that project's own agents.
  useEffect(() => {
    if (!wanted) return
    // Empty-handed on purpose: a session is handed our teammates and reports one
    // flat list with theirs, so only a probe with none names the CLI's own.
    void window.desk
      .probeSession({ ...held.current, people: [], lock: null })
      .then(learnSession)
      .catch(() => undefined)
  }, [wanted, project])

  useEffect(() => {
    if (!awake) return undefined
    const tick = (): void => {
      if (!dueForUsage(statusStore.get().usageAtMs, Date.now(), 'tick')) return
      readUsage()
    }
    const timer = setInterval(tick, TICK_MS)
    window.addEventListener('focus', tick)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', tick)
    }
  }, [awake])

  const wasBusy = useRef(busy)
  useEffect(() => {
    const ended = wasBusy.current && !busy
    wasBusy.current = busy
    if (!awake || !ended) return
    if (!dueForUsage(statusStore.get().usageAtMs, Date.now(), 'turn')) return
    readUsage()
  }, [busy, awake])
}
