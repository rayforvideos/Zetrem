import { useEffect, useState } from 'react'
import type { Catalog, Marketplace, PluginVerb } from '@/entities/plugin'

type Shelf = {
  open: boolean
  show(): void
  hide(): void
  catalog: Catalog
  marketplaces: Marketplace[]
  loading: boolean
  busy: string | null
  note: string | null
  act(verb: PluginVerb, target: string): void
  reload(): void
}

const EMPTY: Catalog = { installed: [], available: [] }

export function usePlugins(wanted: boolean): Shelf {
  const [open, setOpen] = useState(false)
  const [catalog, setCatalog] = useState<Catalog>(EMPTY)
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  function reload(): void {
    setLoading(true)
    void Promise.all([
      window.desk.pluginCatalog().catch(() => EMPTY),
      window.desk.marketplaces().catch(() => []),
    ])
      .then(([found, markets]) => {
        setCatalog(found)
        setMarketplaces(markets)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (open || wanted) reload()
  }, [open, wanted])

  function act(verb: PluginVerb, target: string): void {
    setBusy(target)
    setNote(null)
    void window.desk
      .pluginAct(verb, target)
      .then((result) => {
        setNote(result.ok ? doneLine(verb, target) : lastLine(result.out))
        reload()
      })
      .catch((cause: unknown) => setNote(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setBusy(null))
  }

  return {
    open,
    show: () => setOpen(true),
    hide: () => setOpen(false),
    catalog,
    marketplaces,
    loading,
    busy,
    note,
    act,
    reload,
  }
}

function doneLine(verb: PluginVerb, target: string): string {
  switch (verb) {
    case 'install':
      return `${target} installed. Restart the session to load it.`
    case 'uninstall':
      return `${target} removed`
    case 'enable':
      return `${target} on. Restart the session to load it.`
    case 'disable':
      return `${target} off. The running session keeps it until it ends.`
    case 'update':
      return `${target} updated. Restart the session to load it.`
    case 'market-add':
      return `${target} added`
    case 'market-remove':
      return `${target} removed`
    case 'market-update':
      return `${target} refreshed`
  }
}

function lastLine(out: string): string {
  const lines = out
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  return lines.at(-1) ?? 'That did not work'
}
