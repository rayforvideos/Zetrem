import { useEffect, useRef, useState } from 'react'
import type {
  AvailablePlugin,
  Catalog,
  Marketplace,
  PluginScope,
  PluginVerb,
} from '@/entities/plugin'
import { outcomeLine, useAsk } from '@/shared/lib/ask/ask'

type Shelf = {
  open: boolean
  show(): void
  hide(): void
  catalog: Catalog
  marketplaces: Marketplace[]
  loading: boolean
  browsing: boolean
  browse(again?: boolean): void
  busy: string | null
  note: string | null
  act(verb: PluginVerb, target: string, scope?: PluginScope): void
  reload(): void
}

const EMPTY: Catalog = { installed: [], available: [] }

export function usePlugins(wanted: boolean): Shelf {
  const [open, setOpen] = useState(false)
  const [catalog, setCatalog] = useState<Catalog>(EMPTY)
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([])
  const [loading, setLoading] = useState(false)
  const [available, setAvailable] = useState<AvailablePlugin[]>([])
  const [browsing, setBrowsing] = useState(false)
  const asked = useRef(false)
  const { busy, note, say, ask } = useAsk()

  function reload(): void {
    setLoading(true)
    void Promise.all([
      ask('catalog', 'Could not read the plugin shelf', () => window.desk.pluginCatalog()),
      ask('marketplaces', 'Could not read your marketplaces', () => window.desk.marketplaces()),
    ])
      .then(([found, markets]) => {
        setCatalog(found ?? EMPTY)
        setMarketplaces(markets ?? [])
      })
      .finally(() => setLoading(false))
  }

  function browse(again = false): void {
    if (asked.current && !again) return
    asked.current = true
    setBrowsing(true)
    void ask('available', 'Could not read what is available', () => window.desk.pluginAvailable())
      .then((found) => setAvailable(found?.available ?? []))
      .finally(() => setBrowsing(false))
  }

  useEffect(() => {
    if (open || wanted) reload()
  }, [open, wanted])

  function act(verb: PluginVerb, target: string, scope?: PluginScope): void {
    void ask(target, `Could not ${said(verb)} ${target}`, () =>
      window.desk.pluginAct(verb, target, scope),
    ).then((result) => {
      if (result === null) return
      if (result.ok) {
        asked.current = false
        reload()
      }
      say(outcomeLine(result, doneLine(verb, target)))
    })
  }

  return {
    open,
    show: () => setOpen(true),
    hide: () => setOpen(false),
    catalog: { ...catalog, available },
    marketplaces,
    loading,
    browsing,
    browse,
    busy,
    note,
    act,
    reload,
  }
}

function said(verb: PluginVerb): string {
  return verb.replace('market-', '')
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
