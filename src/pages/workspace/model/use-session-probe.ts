import { useEffect, useRef } from 'react'
import type { RunConfig } from '@/entities/agent-session'
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
  awake = false,
  busy = false,
): void {
  const held = useRef(config)

  // Written after commit, not during render, so a thrown-away render can't
  // leave its config behind for the probe to send.
  useEffect(() => {
    held.current = config
  })

  useEffect(() => {
    if (!wanted) return
    void window.desk
      .keptUsage()
      .then(learnKeptUsage)
      .catch(() => undefined)
    void window.desk
      .probeSession(held.current)
      .then(learnSession)
      .catch(() => undefined)
    readUsage()
  }, [wanted])

  useEffect(() => {
    if (!awake) return undefined
    const ask = (after: 'turn' | 'tick') => () => {
      if (!dueForUsage(statusStore.get().usageAtMs, Date.now(), after)) return
      readUsage()
    }
    const tick = ask('tick')
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
