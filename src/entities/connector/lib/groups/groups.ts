import type { Connector } from '../read-connectors/read-connectors.types'
import { originOf } from '../origin/origin'
import type { ConnectorGroup, ConnectorOrigin } from './groups.types'

const ORDER: { key: ConnectorOrigin; title: string; note: string | null }[] = [
  { key: 'yours', title: 'Yours', note: null },
  {
    key: 'account',
    title: 'Your Claude account',
    note: 'Managed on claude.ai. Sign in or out here, remove them there.',
  },
  {
    key: 'plugin',
    title: 'From plugins',
    note: 'A plugin brings these. Turn the plugin off to lose them.',
  },
]

export function connectorGroupsOf(connectors: Connector[]): ConnectorGroup[] {
  const groups = ORDER.map(({ key, title, note }) => ({
    key,
    title,
    note,
    connectors: connectors.filter((connector) => originOf(connector.name) === key),
  })).filter((group) => group.connectors.length > 0)

  return groups.map((group) => ({
    ...group,
    titled: groups.length > 1 || group.key !== 'yours',
  }))
}
