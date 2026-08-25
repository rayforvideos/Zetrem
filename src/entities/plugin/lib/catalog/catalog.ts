import type { AvailablePlugin, Catalog, InstalledPlugin, Marketplace, PluginScope } from './catalog.types'

const SCOPES: PluginScope[] = ['user', 'project', 'managed']

export function splitId(id: string): { name: string; marketplace: string } {
  const at = id.lastIndexOf('@')
  if (at <= 0) return { name: id, marketplace: '' }
  return { name: id.slice(0, at), marketplace: id.slice(at + 1) }
}

export function readCatalog(raw: unknown): Catalog {
  if (Array.isArray(raw)) {
    return { installed: list(raw).map(installed).filter(known), available: [] }
  }
  const source = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
  return {
    installed: list(source.installed).map(installed).filter(known),
    available: list(source.available).map(available).filter(known),
  }
}

export function readMarketplaces(raw: unknown): Marketplace[] {
  return list(raw)
    .map((entry) => ({
      name: text(entry.name),
      source: text(entry.source),
      origin: text(entry.repo).length > 0 ? text(entry.repo) : null,
    }))
    .filter((market) => market.name.length > 0)
}

function installed(entry: Record<string, unknown>): InstalledPlugin {
  const id = text(entry.id)
  const version = text(entry.version)
  const projectPath = text(entry.projectPath)
  return {
    id,
    ...splitId(id),
    version: version.length > 0 && version !== 'unknown' ? version : null,
    scope: SCOPES.find((scope) => scope === entry.scope) ?? 'unknown',
    projectPath: projectPath.length > 0 ? projectPath : null,
    enabled: entry.enabled !== false,
  }
}

function available(entry: Record<string, unknown>): AvailablePlugin {
  const id = text(entry.pluginId)
  const count = entry.installCount
  return {
    id,
    ...splitId(id),
    description: text(entry.description),
    installCount: typeof count === 'number' && Number.isFinite(count) ? count : null,
  }
}

function known(plugin: { id: string }): boolean {
  return plugin.id.length > 0
}

function list(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null,
  )
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
