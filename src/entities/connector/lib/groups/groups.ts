import type { Connector } from '../read-connectors/read-connectors.types'
import { originOf } from '../origin/origin'
import type { ConnectorGroup, ConnectorOrigin } from './groups.types'
import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'

const ORDER: { key: ConnectorOrigin; title: MessageDescriptor; note: MessageDescriptor | null }[] = [
  { key: 'yours', title: msg`Yours`, note: null },
  {
    key: 'account',
    title: msg`Your Claude account`,
    note: msg`Managed on claude.ai. Sign in or out here, remove them there.`,
  },
  {
    key: 'plugin',
    title: msg`From plugins`,
    note: msg`A plugin brings these. Turn the plugin off to lose them.`,
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
