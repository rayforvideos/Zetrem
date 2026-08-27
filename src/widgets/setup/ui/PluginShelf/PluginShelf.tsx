import { RotateCw } from 'lucide-react'
import type {
  Catalog,
  InstalledPlugin,
  Marketplace,
  PluginScope,
  PluginVerb,
} from '@/entities/plugin'
import { appliesHere } from '@/entities/plugin'
import type { Connector, ConnectorVerb, NewConnector } from '@/entities/connector'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Spinner } from '@/shared/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { useScrollState } from '@/shared/lib/scroll-state/useScrollState'
import { t } from '@lingui/core/macro'
import { BrowseTab } from './BrowseTab'
import { ConnectorsTab } from './ConnectorsTab'
import { InstalledTab } from './InstalledTab'

type PluginShelfProps = {
  catalog: Catalog
  marketplaces: Marketplace[]
  connectors: Connector[]
  busy: string | null
  loading: boolean
  browsing: boolean
  adding: boolean
  project: string | null
  onTab(value: string): void
  onAct(verb: PluginVerb, target: string, scope?: PluginScope): void
  onConnector(verb: ConnectorVerb, target: string): void
  onAddConnector(draft: NewConnector): Promise<boolean>
  onImportConnectors(): void
  onReload(): void
  onClose(): void
}

export function PluginShelf({
  catalog,
  marketplaces,
  connectors,
  busy,
  loading,
  browsing,
  adding,
  project,
  onTab,
  onAct,
  onConnector,
  onAddConnector,
  onImportConnectors,
  onReload,
  onClose,
}: PluginShelfProps) {
  const here = catalog.installed.filter((plugin: InstalledPlugin) =>
    appliesHere(plugin.scope, plugin.projectPath, project),
  )
  const [body] = useScrollState<HTMLDivElement>()

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
          defaultValue="have"
          onValueChange={onTab}
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          <TabsList className="mx-6 mt-4 w-fit">
            <TabsTrigger value="have">{t`What you have`}</TabsTrigger>
            <TabsTrigger value="browse">{t`Add more`}</TabsTrigger>
          </TabsList>

          <div ref={body} className="zt-scroll zt-fade-y min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <TabsContent value="have" className="flex flex-col gap-6">
              <InstalledTab here={here} busy={busy} onAct={onAct} project={project} />
              <ConnectorsTab
                connectors={connectors}
                busy={busy}
                adding={adding}
                onConnector={onConnector}
                onAddConnector={onAddConnector}
                onImportConnectors={onImportConnectors}
              />
            </TabsContent>

            <TabsContent value="browse">
              <BrowseTab
                available={catalog.available}
                held={new Set(catalog.installed.map((plugin) => plugin.id))}
                marketplaces={marketplaces}
                busy={busy}
                loading={browsing}
                onInstall={(id) => onAct('install', id)}
                onAct={onAct}
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
              {t`Reload`}
            </Button>
            <Button size="sm" onClick={onClose} className="rounded-full">
              {t`Done`}
            </Button>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
