export type PluginScope = 'user' | 'project' | 'managed' | 'unknown'

export type PluginVerb =
  | 'install'
  | 'uninstall'
  | 'enable'
  | 'disable'
  | 'update'
  | 'market-add'
  | 'market-remove'
  | 'market-update'

export type InstalledPlugin = {
  id: string
  name: string
  marketplace: string
  version: string | null
  scope: PluginScope
  projectPath: string | null
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
