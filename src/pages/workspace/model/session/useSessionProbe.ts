import { useEffect, useRef } from 'react'
import type { AccountList } from '@/entities/auth'
import type { ChatStatus } from '@/entities/agent-session'
import type { RunConfig } from '@/entities/claude-cli'
import { learnKeptUsage, learnSession } from './session-probe/session-probe'
import { readUsage, readUsageAfter } from './usage-read/usage-read'
import { emailOf, keptForMe } from './usage-owner/usage-owner'

const TICK_MS = 60_000

export function useSessionProbe(
  config: Omit<RunConfig, 'persona'>,
  wanted: boolean,
  project: string | null,
  accounts: AccountList | null,
  account: number,
  status: ChatStatus | null,
  awake = false,
  busy = false,
): void {
  const held = useRef(config)

  useEffect(() => {
    held.current = config
  })

  const mine = emailOf(accounts)
  useEffect(() => {
    if (!wanted) return
    void window.desk
      .keptUsage()
      .then((kept) => learnKeptUsage(keptForMe(kept?.report ?? null, kept?.who ?? null, mine)))
      .catch(() => undefined)
    readUsage()
  }, [wanted, mine])

  // The probe runs claude in the project, so a first launch asks before one is
  // picked and learns nothing of that project's own agents. An account change
  // is the same kind of event: the CLI's session, its agents, its connectors
  // and its model all belonged to the account that has gone.
  useEffect(() => {
    if (!wanted) return
    // Empty-handed on purpose: a session is handed our teammates and reports one
    // flat list with theirs, so only a probe with none names the CLI's own.
    void window.desk
      .probeSession({ ...held.current, people: [], lock: null })
      .then((line) => learnSession(status, line))
      .catch(() => undefined)
  }, [wanted, project, account, status])

  useEffect(() => {
    if (!awake) return undefined
    const tick = (): void => readUsageAfter('tick')
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
    readUsageAfter('turn')
  }, [busy, awake])
}
