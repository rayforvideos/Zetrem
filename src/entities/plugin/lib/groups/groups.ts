import type { InstalledPlugin } from '../catalog/catalog.types'
import type { PluginGroup, PluginGroupKey } from './groups.types'
import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'

const ORDER: { key: PluginGroupKey; title: MessageDescriptor; note: MessageDescriptor | null }[] = [
  { key: 'yours', title: msg`Yours`, note: null },
  {
    key: 'project',
    title: msg`This project`,
    note: msg`Installed for this folder. Anyone who opens it gets them.`,
  },
  {
    key: 'organisation',
    title: msg`Your organisation`,
    note: msg`Set for everyone on your account. They cannot be removed or turned off here.`,
  },
]

function keyOf(plugin: InstalledPlugin): PluginGroupKey {
  if (plugin.scope === 'managed') return 'organisation'
  if (plugin.scope === 'project') return 'project'
  return 'yours'
}

export function groupsOf(plugins: InstalledPlugin[]): PluginGroup[] {
  const groups = ORDER.map(({ key, title, note }) => ({
    key,
    title,
    note,
    plugins: plugins.filter((plugin) => keyOf(plugin) === key),
  })).filter((group) => group.plugins.length > 0)

  return groups.map((group) => ({
    ...group,
    titled: groups.length > 1 || group.key !== 'yours',
  }))
}
