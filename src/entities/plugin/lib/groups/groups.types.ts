import type { MessageDescriptor } from '@lingui/core'
import type { InstalledPlugin } from '../../api/catalog/catalog.types'

export type PluginGroupKey = 'yours' | 'project' | 'organisation'

export type PluginGroup = {
  readonly key: PluginGroupKey
  readonly title: MessageDescriptor
  readonly note: MessageDescriptor | null
  readonly titled: boolean
  readonly plugins: InstalledPlugin[]
}
