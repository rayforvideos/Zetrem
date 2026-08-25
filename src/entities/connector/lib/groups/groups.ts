import { grouped } from '@/shared/lib/grouped/grouped'
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
  const said = new Map(ORDER.map((one) => [one.key, one]))
  return grouped(
    ORDER.map((one) => one.key),
    connectors,
    (connector) => originOf(connector.name),
    'yours',
  ).map((group) => ({
    key: group.key,
    title: said.get(group.key)!.title,
    note: said.get(group.key)!.note,
    titled: group.titled,
    connectors: group.members,
  }))
}
