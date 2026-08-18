import { plural, t } from '@lingui/core/macro'
import { needingAuth } from '../read-connectors/read-connectors'
import type { Connector } from '../read-connectors/read-connectors.types'

// Screen only. Kept apart from the reading module, which the main process bundles.
export function connectorSummary(connectors: Connector[]): string {
  if (connectors.length === 0) return t`No connectors yet`
  const live = connectors.filter((connector) => connector.state === 'connected').length
  const all = connectors.length
  const waiting = needingAuth(connectors).length
  const head = t`${live} of ${all} connected`
  if (waiting === 0) return head
  const rest = plural(waiting, { one: '# needs signing in', other: '# need signing in' })
  return `${head}, ${rest}`
}
