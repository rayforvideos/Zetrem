import { lost } from '@/shared/lib/outcome/outcome'
import type { Outcome } from '@/shared/lib/outcome/outcome.types'
import { stopAllAgents } from '../../../host/agent-host/agent-host'
import { duringAccountWork } from '../../../spawn/account-work/account-work'
import { stopTrackedChildren } from '../../../spawn/run-settled/run-settled'
import { queue } from '../../../store/queue/queue'
import { accountChanged } from '../account-change/account-change'
import type { StopChildren } from './account-guard.types'

const oneAtATime = queue()

// Long enough for a session to finish the turn it is on, short enough that
// nobody thinks the switch has hung.
const STOP_WAIT_MS = 5000

// Every claude this app spawned shares one keychain item and one
// .credentials.json, and refreshes its own tokens into them without touching
// .claude.json's oauthAccount. A child that outlives an account change files
// the account that left under the row of the account that arrived, and that
// row is then gone for good. So they go first, and are seen to go.
async function childrenGone(): Promise<boolean> {
  const [sessions, oneShots] = await Promise.all([
    stopAllAgents(STOP_WAIT_MS),
    stopTrackedChildren(STOP_WAIT_MS),
  ])
  return sessions && oneShots
}

// The work decides whether it will write, and asks for the stop when it knows:
// clicking the row already on the machine, or removing a row that is not the
// active one, moves no credentials and must cost nobody their turn. A re-auth
// asks twice and is stopped once.
function stopOnce(): StopChildren {
  let asked: Promise<boolean> | null = null
  return () => (asked ??= childrenGone())
}

// Everything that writes the login on this machine goes through here: signing
// out is an account change like any other. Each runs alone, holds the latch for
// its whole length so nothing new can spawn into the middle of it, and raises
// the one signal on success.
export function accountWork<T>(
  channel: string,
  work: (stop: StopChildren) => Promise<Outcome<T>>,
): Promise<Outcome<T>> {
  return oneAtATime(() =>
    duringAccountWork(async () => {
      try {
        const done = await work(stopOnce())
        // Everything the app worked out for whoever was signed in a moment ago
        // stops describing anything the moment the account moves.
        if (done.ok) await accountChanged()
        return done
      } catch (cause: unknown) {
        // The pane shows this once and forgets it on the next refresh, so the
        // terminal is the only place a swallowed cause survives.
        console.error(`[accounts] ${channel} failed`, cause)
        return lost<T>('failed', cause instanceof Error ? cause.message : String(cause))
      }
    }),
  )
}
