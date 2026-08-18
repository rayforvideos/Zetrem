import { useState } from 'react'
import { useScrollState } from '@/shared/lib/scroll-state/use-scroll-state'
import { Blocks, Building2, FolderClosed, Plus, RotateCw, Search, Trash2, User } from 'lucide-react'
import { ClaudeMark } from '@/shared/graphics/ClaudeMark/ClaudeMark'
import { appliesHere, browsable, groupsOf, removableHere, switchableHere } from '@/entities/plugin'
import type { PluginGroupKey } from '@/entities/plugin'
import type {
  AvailablePlugin,
  Catalog,
  Marketplace,
  PluginScope,
  PluginVerb,
} from '@/entities/plugin'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Spinner } from '@/shared/ui/spinner'
import { Switch } from '@/shared/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { canSignIn, connectorGroupsOf, removableConnector, shortName } from '@/entities/connector'
import type {
  Connector,
  ConnectorOrigin,
  ConnectorState,
  ConnectorVerb,
  NewConnector,
} from '@/entities/connector'
import { ConnectorMark } from '../ConnectorMark/ConnectorMark'
import { AddConnector } from '../AddConnector/AddConnector'
import { t } from '@lingui/core/macro'
import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'

const CONNECTOR_STATE: Record<ConnectorState, MessageDescriptor> = {
  connected: msg`Connected`,
  'needs-auth': msg`Needs signing in`,
  unapproved: msg`Waiting for your approval in the CLI`,
  failed: msg`Could not connect`,
  unknown: msg`Unknown`,
}

type PluginShelfProps = {
  connectors: Connector[]
  onConnector(verb: ConnectorVerb, target: string): void
  onAddConnector(draft: NewConnector): Promise<boolean>
  onImportConnectors(): void
  adding: boolean
  catalog: Catalog
  marketplaces: Marketplace[]
  loading: boolean
  browsing: boolean
  onTab(value: string): void
  busy: string | null
  onAct(verb: PluginVerb, target: string, scope?: PluginScope): void
  onReload(): void
  project: string | null
  onClose(): void
}

export function PluginShelf({
  connectors,
  onConnector,
  onAddConnector,
  onImportConnectors,
  adding,
  catalog,
  marketplaces,
  loading,
  browsing,
  onTab,
  busy,
  onAct,
  onReload,
  project,
  onClose,
}: PluginShelfProps) {
  const here = catalog.installed.filter((plugin) =>
    appliesHere(plugin.scope, plugin.projectPath, project),
  )
  const [body] = useScrollState<HTMLDivElement>()
  const groups = groupsOf(here)
  const wires = connectorGroupsOf(connectors)

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(86vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <DialogHeader className="flex-none border-b border-border px-6 py-4 text-left">
          <DialogTitle className="text-base">{t`What the session brings`}</DialogTitle>
          <DialogDescription>
            {t`Plugins and connectors your team can reach. Restart the session to load a change.`}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="installed"
          onValueChange={onTab}
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          <TabsList className="mx-6 mt-4 w-fit">
            <TabsTrigger value="installed">{t`Installed · ${here.length}`}</TabsTrigger>
            <TabsTrigger value="browse">{t`Browse`}</TabsTrigger>
            <TabsTrigger value="sources">{t`Sources · ${marketplaces.length}`}</TabsTrigger>
            <TabsTrigger value="connectors">{t`Connectors · ${connectors.length}`}</TabsTrigger>
          </TabsList>

          <div ref={body} className="zt-scroll zt-fade-y min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <TabsContent value="installed" className="flex flex-col gap-5">
              {here.length === 0 && <Quiet>{t`Nothing installed yet.`}</Quiet>}
              {groups.map((group) => (
                <section key={group.key} className="flex flex-col gap-1.5">
                  {group.titled && (
                    <GroupName kind={group.key} title={group.title} note={group.note} />
                  )}
                  <div className="-mx-2 flex flex-col gap-0.5 rounded-xl bg-card/50 px-2 py-1.5">
                  {group.plugins.map((plugin) => (
                <Row
                  key={`${plugin.id}:${plugin.scope}`}
                  title={plugin.name}
                  note={[plugin.marketplace, plugin.version].filter(Boolean).join(' · ')}
                  busy={busy === plugin.id}
                  dim={!plugin.enabled && plugin.scope !== 'managed'}
                >
                  <Slot width="w-[58px]">
                    <Quietly
                      label="Update"
                      onClick={() => onAct('update', plugin.id, plugin.scope)}
                    />
                  </Slot>
                  <Slot width="w-9">
                    {removableHere(plugin.scope, plugin.projectPath, project) && (
                      <Quietly
                        label={t`Remove`}
                        icon={<Trash2 />}
                        onClick={() => onAct('uninstall', plugin.id, plugin.scope)}
                      />
                    )}
                  </Slot>
                  <Slot width="w-8">
                    {switchableHere(plugin.scope, plugin.projectPath, project) && (
                      <Switch
                        checked={plugin.enabled}
                        aria-label={plugin.name}
                        className="zt-hit-around"
                        onCheckedChange={(on) =>
                          onAct(on ? 'enable' : 'disable', plugin.id, plugin.scope)
                        }
                      />
                    )}
                  </Slot>
                </Row>
                  ))}
                  </div>
                </section>
              ))}
            </TabsContent>

            <TabsContent value="browse">
              <Browse
                available={catalog.available}
                held={new Set(catalog.installed.map((plugin) => plugin.id))}
                busy={busy}
                loading={browsing}
                onInstall={(id) => onAct('install', id)}
              />
            </TabsContent>

            <TabsContent value="sources" className="flex flex-col gap-1">
              {marketplaces.map((market) => (
                <Row
                  key={market.name}
                  title={market.name}
                  note={market.origin ?? market.source}
                  busy={busy === market.name}
                >
                  <Quietly label="Refresh" onClick={() => onAct('market-update', market.name)} />
                  <Quietly
                    label={t`Remove`}
                    icon={<Trash2 />}
                    onClick={() => onAct('market-remove', market.name)}
                  />
                </Row>
              ))}
              <AddSource onAdd={(source) => onAct('market-add', source)} />
            </TabsContent>

            <TabsContent value="connectors" className="flex flex-col gap-5">
              {connectors.length === 0 && (
                <p className="px-2 py-2 text-xs text-muted-foreground">
                  {t`No connectors yet. Add one below, or bring over what Claude Desktop already has.`}
                </p>
              )}
              {wires.map((group) => (
                <section key={group.key} className="flex flex-col gap-1.5">
                  {group.titled && (
                    <GroupName kind={group.key} title={group.title} note={group.note} />
                  )}
                  <div className="-mx-2 flex flex-col gap-0.5 rounded-xl bg-card/50 px-2 py-1.5">
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
                  </div>
                </section>
              ))}
              <AddConnector
                taken={connectors.map((connector) => connector.name)}
                busy={adding}
                onAdd={onAddConnector}
                onImport={onImportConnectors}
              />
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex flex-none items-center justify-end gap-3 border-t border-border px-6 py-3">
          <span className="flex flex-none items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onReload}
              className="rounded-full text-muted-foreground"
            >
              {loading ? <Spinner /> : <RotateCw />}
              Reload
            </Button>
            <Button size="sm" onClick={onClose} className="rounded-full">
              Done
            </Button>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Browse({
  available,
  held,
  busy,
  loading,
  onInstall,
}: {
  available: AvailablePlugin[]
  held: Set<string>
  busy: string | null
  loading: boolean
  onInstall(id: string): void
}) {
  const [query, setQuery] = useState('')
  const needle = query.trim()
  const pool = available.filter((plugin) => !held.has(plugin.id))
  const hits = browsable(available, held, query)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-lg bg-card px-3">
        <Search className="size-4 flex-none text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t`Search ${pool.length} plugins`}
          aria-label={t`Search plugins`}
          autoFocus
          className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
      </div>

      {loading && <Quiet>{t`Reading the catalog…`}</Quiet>}
      {!loading && hits.length === 0 && needle.length > 0 && (
        <Quiet>Nothing matches “{needle}”.</Quiet>
      )}
      {!loading && pool.length === 0 && needle.length === 0 && (
        <Quiet>{t`Nothing left to add. Every plugin your sources offer is installed.`}</Quiet>
      )}

      <div className="-mx-2 flex flex-col gap-0.5 rounded-xl bg-card/50 px-2 py-1.5 empty:hidden">
        {hits.map((plugin) => (
          <Row
            key={plugin.id}
            title={plugin.name}
            note={plugin.description}
            busy={busy === plugin.id}
            tall
          >
            <Quietly label="Install" onClick={() => onInstall(plugin.id)} />
          </Row>
        ))}
      </div>
    </div>
  )
}

function AddSource({ onAdd }: { onAdd(source: string): void }) {
  const [source, setSource] = useState('')
  return (
    <form
      className="mt-2 flex items-center gap-2 border-t border-border pt-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (source.trim().length === 0) return
        onAdd(source.trim())
        setSource('')
      }}
    >
      <Input
        value={source}
        onChange={(event) => setSource(event.target.value)}
        placeholder="owner/repo, a URL, or a folder"
        aria-label={t`Add a marketplace`}
        className="h-8 rounded-lg text-sm"
      />
      <Button type="submit" size="sm" variant="ghost" className="flex-none rounded-lg">
        <Plus />
        Add
      </Button>
    </form>
  )
}

type GroupKind = PluginGroupKey | ConnectorOrigin

const GROUP_MARK: Record<GroupKind, React.ReactNode> = {
  yours: <User />,
  project: <FolderClosed />,
  organisation: <Building2 />,
  account: <ClaudeMark size={13} />,
  plugin: <Blocks />,
}

function GroupName({
  kind,
  title,
  note,
}: {
  kind: GroupKind
  title: MessageDescriptor
  note: MessageDescriptor | null
}) {
  return (
    <div className="flex flex-col gap-0.5 px-2">
      <span className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-foreground/80">
        <span className="flex-none text-muted-foreground [&_svg]:size-3.5">
          {GROUP_MARK[kind]}
        </span>
        {i18n._(title)}
      </span>
      {note !== null && (
        <span className="pl-[22px] text-xs leading-snug text-muted-foreground/70">{i18n._(note)}</span>
      )}
    </div>
  )
}

function Slot({ width, children }: { width: string; children: React.ReactNode }) {
  return <span className={cn('flex flex-none items-center justify-center', width)}>{children}</span>
}

function Row({
  title,
  note,
  busy,
  mark = null,
  dim = false,
  tall = false,
  children,
}: {
  title: string
  note: string
  busy: boolean
  mark?: React.ReactNode
  dim?: boolean
  tall?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg px-2 py-2',
        dim && 'text-muted-foreground',
      )}
    >
      {mark}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm leading-tight">{title}</span>
        {note.length > 0 && (
          <span
            className={cn(
              'text-xs leading-snug text-muted-foreground',
              tall ? 'line-clamp-2' : 'truncate',
            )}
          >
            {note}
          </span>
        )}
      </span>
      <span className="flex flex-none items-center gap-1">
        {busy ? <Spinner className="size-4 text-muted-foreground" /> : children}
      </span>
    </div>
  )
}

function Quietly({
  label,
  icon,
  onClick,
}: {
  label: string
  icon?: React.ReactNode
  onClick(): void
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="h-7 rounded-lg px-2 text-xs text-muted-foreground"
    >
      {icon ?? label}
    </Button>
  )
}

function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="px-2 py-1 text-xs text-muted-foreground">{children}</p>
}
