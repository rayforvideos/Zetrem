import { grouped } from '@/shared/lib/grouped/grouped'
import type { Connector } from '../../api/read-connectors/read-connectors.types'
import { originOf } from '../origin/origin'
import type { ConnectorGroup, ConnectorOrigin } from './groups.types'
import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'

const ORDER: { key: ConnectorOrigin; title: MessageDescriptor; note: MessageDescriptor | null }[] =
  [
    { key: 'yours', title: msg`Yours`, note: null },
    {
      key: 'account',
      title: msg`Your Claude account`,
      note: msg`Signed in and out here. To remove one, go to claude.ai.`,
    },
    {
      key: 'plugin',
      title: msg`From plugins`,
      note: msg`Included in a plugin. To remove one, turn its plugin off.`,
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
