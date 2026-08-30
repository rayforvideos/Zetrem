import type { ConnectorsAskedFor } from './connectors-due.types'

// Connectors are read in the project's folder, and Claude's own are held per
// account, so an answer is only still good for the project and the account it
// was read for. Nobody is asked twice for the same pair.
export function connectorsDue(
  wanted: boolean,
  asked: ConnectorsAskedFor | null,
  now: ConnectorsAskedFor,
): boolean {
  if (!wanted) return false
  if (asked === null) return true
  return asked.project !== now.project || asked.account !== now.account
}
