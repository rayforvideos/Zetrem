export type PluginScope = 'user' | 'project' | 'unknown'

export type PluginVerb =
  | 'install'
  | 'uninstall'
  | 'enable'
  | 'disable'
  | 'update'
  | 'market-add'
  | 'market-remove'
  | 'market-update'

export type PluginRun = { ok: boolean; out: string }

export type InstalledPlugin = {
  id: string
  name: string
  marketplace: string
  version: string | null
  scope: PluginScope
  enabled: boolean
}

export type AvailablePlugin = {
  id: string
  name: string
  marketplace: string
  description: string
  installCount: number | null
}

export type Marketplace = {
  name: string
  source: string
  origin: string | null
}

export type Catalog = {
  installed: InstalledPlugin[]
  available: AvailablePlugin[]
}
