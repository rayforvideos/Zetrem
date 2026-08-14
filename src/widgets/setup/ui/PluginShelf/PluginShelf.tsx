import { useState } from 'react'
import { Plus, RotateCw, Search, Trash2 } from 'lucide-react'
import type { AvailablePlugin, Catalog, Marketplace, PluginVerb } from '@/entities/plugin'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Spinner } from '@/shared/ui/spinner'
import { Switch } from '@/shared/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'

type PluginShelfProps = {
  catalog: Catalog
  marketplaces: Marketplace[]
  loading: boolean
  busy: string | null
  note: string | null
  onAct(verb: PluginVerb, target: string): void
  onReload(): void
  onClose(): void
}

const HITS = 20

export function PluginShelf({
  catalog,
  marketplaces,
  loading,
  busy,
  note,
  onAct,
  onReload,
  onClose,
}: PluginShelfProps) {
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[86vh] gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <DialogHeader className="border-b border-border px-6 py-4 text-left">
          <DialogTitle className="text-base">Plugins</DialogTitle>
          <DialogDescription>
            Skills, agents and commands other people wrote. Restart the session to load a change.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="installed" className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList className="mx-6 mt-4 w-fit">
            <TabsTrigger value="installed">Installed · {catalog.installed.length}</TabsTrigger>
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="sources">Sources · {marketplaces.length}</TabsTrigger>
          </TabsList>

          <div className="zt-scroll min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <TabsContent value="installed" className="flex flex-col gap-1">
              {catalog.installed.length === 0 && <Quiet>Nothing installed yet.</Quiet>}
              {catalog.installed.map((plugin) => (
                <Row
                  key={plugin.id}
                  title={plugin.name}
                  note={[plugin.marketplace, plugin.version].filter(Boolean).join(' · ')}
                  busy={busy === plugin.id}
                  dim={!plugin.enabled}
                >
                  <Quietly label="Update" onClick={() => onAct('update', plugin.id)} />
                  <Quietly
                    label="Remove"
                    icon={<Trash2 />}
                    onClick={() => onAct('uninstall', plugin.id)}
                  />
                  <Switch
                    checked={plugin.enabled}
                    aria-label={plugin.name}
                    onCheckedChange={(on) => onAct(on ? 'enable' : 'disable', plugin.id)}
                  />
                </Row>
              ))}
            </TabsContent>

            <TabsContent value="browse">
              <Browse
                available={catalog.available}
                held={new Set(catalog.installed.map((plugin) => plugin.id))}
                busy={busy}
                loading={loading}
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
                    label="Remove"
                    icon={<Trash2 />}
                    onClick={() => onAct('market-remove', market.name)}
                  />
                </Row>
              ))}
              <AddSource onAdd={(source) => onAct('market-add', source)} />
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-3">
          <span data-plugin-note className="min-w-0 truncate text-xs text-muted-foreground">
            {note ?? ''}
          </span>
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
  const needle = query.trim().toLowerCase()
  const pool = available.filter((plugin) => !held.has(plugin.id))
  const hits =
    needle.length === 0
      ? []
      : pool.filter((plugin) =>
          `${plugin.name} ${plugin.description}`.toLowerCase().includes(needle),
        )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-lg bg-card px-3">
        <Search className="size-4 flex-none text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${pool.length} plugins`}
          aria-label="Search plugins"
          autoFocus
          className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
      </div>

      {needle.length === 0 && (
        <Quiet>
          {loading ? 'Reading the catalog…' : 'Type to search. Results appear as you type.'}
        </Quiet>
      )}
      {needle.length > 0 && hits.length === 0 && <Quiet>Nothing matches “{query.trim()}”.</Quiet>}

      <div className="flex flex-col gap-1">
        {hits.slice(0, HITS).map((plugin) => (
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
        {hits.length > HITS && <Quiet>{hits.length - HITS} more. Narrow the search.</Quiet>}
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
        aria-label="Add a marketplace"
        className="h-8 rounded-lg text-sm"
      />
      <Button type="submit" size="sm" variant="ghost" className="flex-none rounded-lg">
        <Plus />
        Add
      </Button>
    </form>
  )
}

function Row({
  title,
  note,
  busy,
  dim = false,
  tall = false,
  children,
}: {
  title: string
  note: string
  busy: boolean
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
