export { readCatalog, readMarketplaces, splitId } from './lib/catalog/catalog'
export { safeTarget } from './lib/target/target'
export { withScope } from './lib/scope/scope'
export { appliesHere, removableHere, switchableHere } from './lib/where/where'
export { browsable } from './lib/browse/browse'
export { groupsOf } from './lib/groups/groups'
export type { PluginGroup, PluginGroupKey } from './lib/groups/groups.types'
export type {
  AvailablePlugin,
  Catalog,
  InstalledPlugin,
  Marketplace,
  PluginScope,
  PluginVerb,
} from './lib/catalog/catalog.types'
