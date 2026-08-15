import type { InstalledPlugin } from '../catalog/catalog.types'

export type PluginGroupKey = 'yours' | 'project' | 'organisation'

export type PluginGroup = {
  readonly key: PluginGroupKey
  readonly title: string
  readonly note: string | null
  readonly titled: boolean
  readonly plugins: InstalledPlugin[]
}
