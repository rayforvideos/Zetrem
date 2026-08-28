import { MoreHorizontal } from 'lucide-react'
import {
  canSignIn,
  connectorGroupsOf,
  originOf,
  removableConnector,
  shortName,
} from '@/entities/connector'
import type { Connector, ConnectorState, ConnectorVerb, NewConnector } from '@/entities/connector'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { ConnectorMark } from '../ConnectorMark/ConnectorMark'
import { AddConnector } from '../AddConnector/AddConnector'
import { t } from '@lingui/core/macro'
import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'
import { Badge, Group, Quietly, Row, SectionTitle } from './parts'

const STATE: Record<
  ConnectorState,
  { word: MessageDescriptor; tone: 'ok' | 'attention' | 'danger' | 'muted' }
> = {
  connected: { word: msg`Connected`, tone: 'ok' },
  'needs-auth': { word: msg`Sign in needed`, tone: 'attention' },
  unapproved: { word: msg`Awaiting approval`, tone: 'muted' },
  failed: { word: msg`Can't connect`, tone: 'danger' },
  unknown: { word: msg`Unknown`, tone: 'muted' },
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
    <section className="flex flex-col gap-2">
      <SectionTitle>{t`Connectors`}</SectionTitle>
      {connectors.length === 0 && (
        <p className="px-2 py-1 text-xs text-muted-foreground">
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
          {group.connectors.map((connector) => {
            const state = STATE[connector.state]
            // The URL is the identity only for one a person added by it; for an
            // account or plugin connector the brand name is the identity.
            const showUrl = originOf(connector.name) === 'yours'
            return (
              <Row
                key={connector.name}
                title={shortName(connector.name)}
                note={showUrl ? connector.where : ''}
                busy={busy === connector.name}
                mark={<ConnectorMark where={connector.where} />}
              >
                <Badge tone={state.tone}>{i18n._(state.word)}</Badge>
                {canSignIn(connector) &&
                  (connector.state === 'connected' ? (
                    <Quietly
                      label={t`Sign out`}
                      onClick={() => onConnector('logout', connector.name)}
                    />
                  ) : (
                    <Quietly
                      label={t`Sign in`}
                      onClick={() => onConnector('login', connector.name)}
                    />
                  ))}
                {removableConnector(connector.name) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t`More for ${shortName(connector.name)}`}
                        className="rounded-md text-muted-foreground"
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => onConnector('remove', connector.name)}
                      >
                        {t`Remove`}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </Row>
            )
          })}
        </Group>
      ))}
      <AddConnector
        taken={connectors.map((connector) => connector.name)}
        busy={adding}
        onAdd={onAddConnector}
        onImport={onImportConnectors}
      />
    </section>
  )
}
