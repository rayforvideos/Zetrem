import { Trash2 } from 'lucide-react'
import { canSignIn, connectorGroupsOf, removableConnector, shortName } from '@/entities/connector'
import type { Connector, ConnectorState, ConnectorVerb, NewConnector } from '@/entities/connector'
import { ConnectorMark } from '../ConnectorMark/ConnectorMark'
import { AddConnector } from '../AddConnector/AddConnector'
import { t } from '@lingui/core/macro'
import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'
import { Group, Quietly, Row } from './parts'

const CONNECTOR_STATE: Record<ConnectorState, MessageDescriptor> = {
  connected: msg`Connected`,
  'needs-auth': msg`Needs signing in`,
  unapproved: msg`Waiting for your approval in the CLI`,
  failed: msg`Could not connect`,
  unknown: msg`Unknown`,
}

export function ConnectorsTab({
  connectors,
  busy,
  adding,
  onConnector,
  onAddConnector,
  onImportConnectors,
}: {
  connectors: Connector[]
  busy: string | null
  adding: boolean
  onConnector(verb: ConnectorVerb, target: string): void
  onAddConnector(draft: NewConnector): Promise<boolean>
  onImportConnectors(): void
}) {
  const wires = connectorGroupsOf(connectors)

  return (
    <>
      {connectors.length === 0 && (
        <p className="px-2 py-2 text-xs text-muted-foreground">
          {t`No connectors yet. Add one below, or bring over what Claude Desktop already has.`}
        </p>
      )}
      {wires.map((group) => (
        <Group
          key={group.key}
          kind={group.key}
          title={group.title}
          note={group.note}
          titled={group.titled}
        >
          {group.connectors.map((connector) => (
            <Row
              key={connector.name}
              title={shortName(connector.name)}
              note={[i18n._(CONNECTOR_STATE[connector.state]), connector.where]
                .filter(Boolean)
                .join(' · ')}
              busy={busy === connector.name}
              mark={<ConnectorMark where={connector.where} />}
            >
              {canSignIn(connector) &&
                (connector.state === 'connected' ? (
                  <Quietly
                    label={t`Sign out`}
                    onClick={() => onConnector('logout', connector.name)}
                  />
                ) : (
                  <Quietly label={t`Sign in`} onClick={() => onConnector('login', connector.name)} />
                ))}
              {removableConnector(connector.name) && (
                <Quietly
                  label={t`Remove`}
                  icon={<Trash2 />}
                  onClick={() => onConnector('remove', connector.name)}
                />
              )}
            </Row>
          ))}
        </Group>
      ))}
      <AddConnector
        taken={connectors.map((connector) => connector.name)}
        busy={adding}
        onAdd={onAddConnector}
        onImport={onImportConnectors}
      />
    </>
  )
}
